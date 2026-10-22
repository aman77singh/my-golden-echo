import { Types } from "mongoose";
import { Thought, IThoughtDoc } from "../models/Thought.js";
import { AuthUser, ThoughtKind, ThoughtVisibility } from "../types/shared.js";
import { ForbiddenError, NotFoundError, BadRequestError } from "../utils/errors.js";

export interface CreateThoughtDTO {
  body: string;
  kind: ThoughtKind;
  visibility?: ThoughtVisibility;
  justVenting?: boolean;
}

export interface ThoughtResponseDTO {
  emoji?: string;
  note?: string;
}

export class ThoughtService {
  /**
   * Create a thought or insecurity.
   * Insecurity defaults to 'private' visibility if not specified.
   */
  static async createThought(currentUser: AuthUser, data: CreateThoughtDTO): Promise<IThoughtDoc> {
    const visibility: ThoughtVisibility =
      data.visibility ?? (data.kind === "insecurity" ? "private" : "shared");

    const thought = await Thought.create({
      coupleId: new Types.ObjectId(currentUser.coupleId),
      userId: new Types.ObjectId(currentUser.id),
      body: data.body,
      kind: data.kind,
      visibility,
      justVenting: data.justVenting ?? false,
      responses: [],
    });

    return thought;
  }

  /**
   * List thoughts for current user:
   * Returns current user's thoughts (both private and shared) + partner's shared thoughts.
   * Partner's private thoughts are NEVER returned.
   */
  static async getThoughts(
    currentUser: AuthUser,
    options?: { kind?: ThoughtKind }
  ): Promise<IThoughtDoc[]> {
    const coupleId = new Types.ObjectId(currentUser.coupleId);
    const currentUserId = new Types.ObjectId(currentUser.id);

    const query: any = {
      coupleId,
      $or: [
        { userId: currentUserId }, // Author sees all their own thoughts
        { userId: { $ne: currentUserId }, visibility: "shared" }, // Partner sees only shared
      ],
    };

    if (options?.kind) {
      query.kind = options.kind;
    }

    return Thought.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get a single thought by ID:
   * Enforces privacy rule: if not the author and visibility is private, throws ForbiddenError.
   */
  static async getThoughtById(currentUser: AuthUser, thoughtId: string): Promise<IThoughtDoc> {
    const thought = await Thought.findOne({
      _id: new Types.ObjectId(thoughtId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!thought) {
      throw new NotFoundError("Thought not found.");
    }

    // Authorization rule:
    // If not author and visibility !== 'shared', cannot read!
    if (thought.userId.toString() !== currentUser.id && thought.visibility !== "shared") {
      throw new ForbiddenError("You cannot access your partner's private thought.");
    }

    return thought;
  }

  /**
   * Only the author can update their thought.
   */
  static async updateThought(
    currentUser: AuthUser,
    thoughtId: string,
    data: Partial<CreateThoughtDTO>
  ): Promise<IThoughtDoc> {
    const thought = await Thought.findOne({
      _id: new Types.ObjectId(thoughtId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!thought) {
      throw new NotFoundError("Thought not found.");
    }

    if (thought.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the author may update this thought.");
    }

    if (data.body !== undefined) thought.body = data.body;
    if (data.visibility !== undefined) thought.visibility = data.visibility;
    if (data.justVenting !== undefined) thought.justVenting = data.justVenting;

    await thought.save();
    return thought;
  }

  /**
   * Only the author can delete their thought.
   */
  static async deleteThought(currentUser: AuthUser, thoughtId: string): Promise<void> {
    const thought = await Thought.findOne({
      _id: new Types.ObjectId(thoughtId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!thought) {
      throw new NotFoundError("Thought not found.");
    }

    if (thought.userId.toString() !== currentUser.id) {
      throw new ForbiddenError("Only the author may delete this thought.");
    }

    await thought.deleteOne();
  }

  /**
   * Add response to a thought:
   * Rule: "Responses can be added only by the partner, never the author.
   * Insecurity responses are limited to an emoji or a note of up to 200 characters."
   */
  static async addResponse(
    currentUser: AuthUser,
    thoughtId: string,
    response: ThoughtResponseDTO
  ): Promise<IThoughtDoc> {
    const thought = await Thought.findOne({
      _id: new Types.ObjectId(thoughtId),
      coupleId: new Types.ObjectId(currentUser.coupleId),
    });

    if (!thought) {
      throw new NotFoundError("Thought not found.");
    }

    // Rule: author cannot respond to own thought
    if (thought.userId.toString() === currentUser.id) {
      throw new ForbiddenError("You cannot respond to your own thought or insecurity.");
    }

    // Rule: cannot respond to an unshared/private thought
    if (thought.visibility !== "shared") {
      throw new ForbiddenError("You cannot respond to a private thought.");
    }

    // Rule: Insecurity responses are limited to an emoji or a note of up to 200 characters
    if (thought.kind === "insecurity") {
      if (response.note && response.note.length > 200) {
        throw new BadRequestError("Insecurity responses are limited to a note of up to 200 characters.");
      }
      if (!response.emoji && !response.note) {
        throw new BadRequestError("Insecurity response must include an emoji or a note.");
      }
    }

    thought.responses.push({
      userId: new Types.ObjectId(currentUser.id),
      emoji: response.emoji,
      note: response.note,
      createdAt: new Date(),
    } as any);

    await thought.save();
    return thought;
  }
}
