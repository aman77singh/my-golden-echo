import { Types } from "mongoose";
import { ProgressPost, IProgressPostDoc } from "../models/ProgressPost.js";
import { User } from "../models/User.js";
import { AuthUser } from "../types/shared.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

export interface CreateProgressPostDTO {
  goalId?: string;
  category: string;
  body: string;
  countAdded?: number;
  minutes?: number;
  struggled?: boolean;
  mediaUrls?: string[];
  voiceUrl?: string;
}

export interface ProgressReplyDTO {
  body?: string;
  voiceUrl?: string;
  quickCheer?: string;
}

export class ProgressService {
  /**
   * Create a progress post
   */
  static async createPost(currentUser: AuthUser, data: CreateProgressPostDTO): Promise<IProgressPostDoc> {
    const post = await ProgressPost.create({
      coupleId: new Types.ObjectId(currentUser.coupleId),
      userId: new Types.ObjectId(currentUser.id),
      goalId: data.goalId ? new Types.ObjectId(data.goalId) : undefined,
      category: data.category,
      body: data.body,
      countAdded: data.countAdded ?? 0,
      minutes: data.minutes ?? 0,
      struggled: data.struggled ?? false,
      mediaUrls: data.mediaUrls ?? [],
      voiceUrl: data.voiceUrl,
      replies: [],
      reactions: [],
    });

    return post;
  }

  /**
   * Get progress posts for couple
   */
  static async getPosts(
    currentUser: AuthUser,
    options?: { category?: string; goalId?: string; limit?: number; skip?: number }
  ): Promise<IProgressPostDoc[]> {
    const query: any = {
      coupleId: new Types.ObjectId(currentUser.coupleId),
    };

    if (options?.category) query.category = options.category;
    if (options?.goalId) query.goalId = new Types.ObjectId(options.goalId);

    const limit = Math.min(options?.limit ?? 50, 100);
    const skip = options?.skip ?? 0;

    return ProgressPost.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  /**
   * Only the author may edit a progress post
   */
  static async updatePost(
    currentUser: AuthUser,
    postId: string,
    data: Partial<CreateProgressPostDTO>
  ): Promise<IProgressPostDoc> {
    const post = await ProgressPost.findOne({
      _id: new Types.ObjectId(postId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!post) {
      throw new NotFoundError("Progress post not found.");
    }

    if (post.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the author may edit this progress post.");
    }

    if (data.body !== undefined) post.body = data.body;
    if (data.category !== undefined) post.category = data.category;
    if (data.countAdded !== undefined) post.countAdded = data.countAdded;
    if (data.minutes !== undefined) post.minutes = data.minutes;
    if (data.struggled !== undefined) post.struggled = data.struggled;
    if (data.mediaUrls !== undefined) post.mediaUrls = data.mediaUrls;
    if (data.voiceUrl !== undefined) post.voiceUrl = data.voiceUrl;

    await post.save();
    return post;
  }

  /**
   * Only the author may delete a progress post
   */
  static async deletePost(currentUser: AuthUser, postId: string): Promise<void> {
    const post = await ProgressPost.findOne({
      _id: new Types.ObjectId(postId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!post) {
      throw new NotFoundError("Progress post not found.");
    }

    if (post.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the author may delete this progress post.");
    }

    await post.deleteOne();
  }

  /**
   * Partner adds reply
   */
  static async addReply(
    currentUser: AuthUser,
    postId: string,
    data: ProgressReplyDTO
  ): Promise<IProgressPostDoc> {
    const post = await ProgressPost.findOne({
      _id: new Types.ObjectId(postId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!post) {
      throw new NotFoundError("Progress post not found.");
    }

    post.replies.push({
      userId: new Types.ObjectId(currentUser.id),
      body: data.body,
      voiceUrl: data.voiceUrl,
      quickCheer: data.quickCheer,
      createdAt: new Date(),
    } as any);

    await post.save();
    return post;
  }

  /**
   * Users delete ONLY their own replies
   */
  static async deleteReply(
    currentUser: AuthUser,
    postId: string,
    replyId: string
  ): Promise<IProgressPostDoc> {
    const post = await ProgressPost.findOne({
      _id: new Types.ObjectId(postId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!post) {
      throw new NotFoundError("Progress post not found.");
    }

    const reply = post.replies.id(replyId);
    if (!reply) {
      throw new NotFoundError("Reply not found.");
    }

    if (reply.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("You may only delete your own reply.");
    }

    reply.deleteOne();
    await post.save();
    return post;
  }

  /**
   * Toggle reaction: users add or delete only their own reactions
   */
  static async toggleReaction(
    currentUser: AuthUser,
    postId: string,
    emoji: string
  ): Promise<IProgressPostDoc> {
    const post = await ProgressPost.findOne({
      _id: new Types.ObjectId(postId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!post) {
      throw new NotFoundError("Progress post not found.");
    }

    const existingIndex = post.reactions.findIndex(
      (r) => r.userId.toString() === currentUser.id && r.emoji === emoji
    );

    if (existingIndex !== -1) {
      // User removes their own reaction
      post.reactions.splice(existingIndex, 1);
    } else {
      // User adds reaction
      post.reactions.push({
        userId: new Types.ObjectId(currentUser.id),
        emoji,
      });
    }

    await post.save();
    return post;
  }

  /**
   * Get partner progress and reaction status for today
   */
  static async getProgressStatus(currentUser: AuthUser): Promise<{
    partnerPostedToday: boolean;
    partnerReactedToday: boolean;
    partnerName: string;
    partnerRole?: string;
  }> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);
    const userId = new Types.ObjectId(currentUser.id);

    const partner = await User.findOne({
      coupleId,
      _id: { $ne: userId },
    }).lean();

    if (!partner) {
      return {
        partnerPostedToday: false,
        partnerReactedToday: false,
        partnerName: "Partner",
      };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [partnerPostToday, myPostWithPartnerReaction] = await Promise.all([
      ProgressPost.findOne({
        coupleId,
        userId: partner._id,
        createdAt: { $gte: startOfDay },
      }).lean(),
      ProgressPost.findOne({
        coupleId,
        userId,
        "reactions.userId": partner._id,
      }).lean(),
    ]);

    return {
      partnerPostedToday: !!partnerPostToday,
      partnerReactedToday: !!myPostWithPartnerReaction,
      partnerName: partner.name,
      partnerRole: partner.role,
    };
  }
}
