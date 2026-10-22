import { relationshipContent } from "./content/relationship";

export const loveNotes = [
  "Sometimes I still can't believe you chose me on a random Tuesday and never stopped.",
  "You have this laugh you do only when you're truly caught off guard. I collect those.",
  "I think about the version of me before you and I don't really recognize him.",
  "Reminder to self: tell her the small things too, not just the big ones.",
  "If love had a soundtrack, half of it would just be our dumb inside jokes.",
  "In a world full of noise, you are my favorite quiet place.",
  "Every single day is a little universe with you.",
  "Still here. Still choosing you. Still figuring it out, together.",
  "Proof that home can be a person.",
  "Always save me the seat across from you.",
  "Ordinary mornings, extraordinary luck with you.",
  "The quiet dates count twice.",
  "Somewhere between lost and exactly where we belonged.",
  "Your hand found mine first, and that was everything.",
  "I love who you are when nobody is watching.",
  "Thank you for being my constant anchor and my sweetest adventure."
];

/**
 * Deterministically returns a love note for the given date.
 */
export function getDailyLoveNote(date: Date = new Date()): {
  note: string;
  dayIndex: number;
} {
  const utcDay = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
      (1000 * 60 * 60 * 24)
  );
  const index = Math.abs(utcDay) % loveNotes.length;
  return {
    note: loveNotes[index],
    dayIndex: index + 1,
  };
}

export const appConfig = {
  couple: relationshipContent.couple,
  loveNotes,
  getDailyLoveNote,
};

export default appConfig;
