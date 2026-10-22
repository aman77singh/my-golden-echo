import { Types } from "mongoose";
import { Message, IMessageDoc } from "../models/Message.js";
import { AuthUser } from "../types/shared.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { emitToCouple } from "../socket.js";

export interface SendMessageDTO {
  body?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  replyTo?: string;
}

export class MessageService {
  /**
   * Send a message in couple's chat
   */
  static async sendMessage(currentUser: AuthUser, data: SendMessageDTO): Promise<IMessageDoc> {
    let message = await Message.create({
      coupleId: new Types.ObjectId(currentUser.coupleId),
      senderId: new Types.ObjectId(currentUser.id),
      body: data.body,
      mediaUrl: data.mediaUrl,
      voiceUrl: data.voiceUrl,
      replyTo: data.replyTo ? new Types.ObjectId(data.replyTo) : undefined,
      reactions: [],
    });

    if (data.replyTo) {
      message = await message.populate("replyTo", "body senderId mediaUrl voiceUrl");
    }

    // Emit message:new over Socket.IO to couple
    emitToCouple(currentUser.coupleId, "message:new", message);

    return message;
  }

  /**
   * Both partners can read the couple's messages
   */
  static async getMessages(
    currentUser: AuthUser,
    options?: { limit?: number; before?: string }
  ): Promise<IMessageDoc[]> {
    const query: any = {
      coupleId: new Types.ObjectId(currentUser.coupleId),
    };

    if (options?.before) {
      query.createdAt = { $lt: new Date(options.before) };
    }

    const limit = Math.min(options?.limit ?? 50, 100);

    return Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("replyTo", "body senderId mediaUrl voiceUrl");
  }

  /**
   * Mark messages as seen by partner
   */
  static async markSeen(currentUser: AuthUser): Promise<void> {
    const seenAt = new Date();
    const result = await Message.updateMany(
      {
        coupleId: new Types.ObjectId(currentUser.coupleId),
        senderId: { $ne: new Types.ObjectId(currentUser.id) },
        seenAt: { $exists: false },
      },
      {
        $set: { seenAt },
      }
    );

    if (result.modifiedCount > 0) {
      emitToCouple(currentUser.coupleId, "message:seen", {
        seenAt,
        seenBy: currentUser.id,
      });
    }
  }

  /**
   * Only the sender can delete their message
   */
  static async deleteMessage(currentUser: AuthUser, messageId: string): Promise<void> {
    const message = await Message.findOne({
      _id: new Types.ObjectId(messageId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!message) {
      throw new NotFoundError("Message not found.");
    }

    if (message.senderId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the sender may delete this message.");
    }

    await message.deleteOne();

    emitToCouple(currentUser.coupleId, "message:delete", { messageId });
  }

  /**
   * Toggle reaction on message
   */
  static async toggleReaction(
    currentUser: AuthUser,
    messageId: string,
    emoji: string
  ): Promise<IMessageDoc> {
    const message = await Message.findOne({
      _id: new Types.ObjectId(messageId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!message) {
      throw new NotFoundError("Message not found.");
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === currentUser.id && r.emoji === emoji
    );

    if (existingIndex !== -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({
        userId: new Types.ObjectId(currentUser.id),
        emoji,
      });
    }

    await message.save();

    emitToCouple(currentUser.coupleId, "message:reaction", {
      messageId: message._id.toString(),
      reactions: message.reactions,
    });

    return message;
  }
}
