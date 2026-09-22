/**
 * THE ONE EDITABLE FILE
 * Change names, dates, writing, image order, captions, and Spotify details here.
 * Replace the three imported demo photographs with your own files in src/assets.
 */
import rooftop from "@/assets/memory-rooftop.jpg";
import city from "@/assets/memory-city.jpg";
import cafe from "@/assets/memory-cafe.jpg";

export const relationshipContent = {
  couple: {
    firstName: "Maya",
    secondName: "Noah",
    initials: ["M", "N"],
    tagline: "A little archive of all the ways we became us.",
    // ISO date: YYYY-MM-DDTHH:mm:ss
    togetherSince: "2022-09-17T19:30:00",
    heroImage: rooftop,
  },
  navigation: [
    { id: "home", label: "Home / Us" },
    { id: "timeline", label: "Our Timeline" },
    { id: "photos", label: "Photo Dump" },
    { id: "apologies", label: "My Apologies" },
    { id: "thoughts", label: "Random Thoughts" },
    { id: "music", label: "Music" },
    { id: "letter", label: "A Letter To You" },
  ],
  timeline: [
    { date: "The beginning", title: "The First Hello", text: "A random comment turned into a 3-hour conversation. Neither of us saw that coming." },
    { date: "A week later", title: "First Date Jitters", text: "I changed my outfit four times. You pretended not to notice I was nervous." },
    { date: "The first getaway", title: "The Trip That Changed Everything", text: "New city, no plans, just us — and somehow that was the best itinerary we never made." },
    { date: "The hard chapter", title: "The Fight We Don't Talk About", text: "We were both wrong. We were both stubborn. We both stayed anyway." },
    { date: "The turning point", title: "The Apology That Meant It", text: "Not the words — the way things felt different after." },
    { date: "Right now", title: "Today", text: "Still here. Still choosing you. Still figuring it out, together." },
  ],
  photos: [
    { src: city, caption: "No map, no hurry, no better place to be.", position: "50% 45%" },
    { src: cafe, caption: "The quiet dates count twice.", position: "50% 52%" },
    { src: rooftop, caption: "Our favorite view was never the skyline.", position: "50% 35%" },
    { src: city, caption: "Rain made everything look like a movie.", position: "43% 65%" },
    { src: rooftop, caption: "Blue hour, warm lights, you.", position: "58% 52%" },
    { src: cafe, caption: "Two coffees. One very long conversation.", position: "50% 38%" },
    { src: city, caption: "Somewhere between lost and exactly where we belonged.", position: "52% 30%" },
    { src: cafe, caption: "Your hand found mine first.", position: "48% 65%" },
    { src: rooftop, caption: "A soft place to land.", position: "42% 62%" },
    { src: city, caption: "Still choosing the long way home.", position: "55% 52%" },
    { src: cafe, caption: "Ordinary mornings, extraordinary luck.", position: "55% 46%" },
    { src: rooftop, caption: "Everything went quiet in the best way.", position: "62% 42%" },
    { src: city, caption: "The night we forgot the time.", position: "38% 48%" },
    { src: cafe, caption: "Small rituals. Big love.", position: "45% 56%" },
    { src: rooftop, caption: "Proof that home can be a person.", position: "52% 58%" },
    { src: city, caption: "One more block, one more story.", position: "62% 58%" },
    { src: cafe, caption: "Your laugh, just out of frame.", position: "38% 42%" },
    { src: rooftop, caption: "We stayed until the lights went out.", position: "50% 28%" },
    { src: city, caption: "A very good day to be us.", position: "47% 38%" },
    { src: cafe, caption: "Always save me the seat across from you.", position: "60% 62%" },
  ],
  apologies: [
    "For the nights I got quiet instead of talking it out.",
    "For making you repeat yourself because I wasn't really listening the first time.",
    "For every time ‘I'm fine’ meant the opposite.",
    "For not saying sorry fast enough, even when I knew I should.",
  ],
  thoughts: [
    "Sometimes I still can't believe you chose me on a random Tuesday and never stopped.",
    "You have this laugh you do only when you're truly caught off guard. I collect those.",
    "I think about the version of me before you and I don't really recognize him.",
    "Reminder to self: tell her the small things too, not just the big ones.",
    "If love had a soundtrack, half of it would just be our dumb inside jokes.",
  ],
  letter: [
    "My love,",
    "There are a thousand versions of us I keep tucked away — the loud ones, the quiet ones, and all the ordinary Tuesdays in between.",
    "I love who you are when nobody is watching. I love the way you make room for joy, and the way you stay when life gets difficult.",
    "You have taught me that love is not a grand speech. It is listening twice. It is coming back to the conversation. It is choosing each other in a hundred small ways.",
    "I know I will not always get it right. But I promise to keep noticing, keep learning, and keep reaching for your hand.",
    "If I could give you one thing, it would be the ability to see yourself through my eyes — brave, impossible, tender, and entirely worth choosing.",
    "Still yours. Still us. Always.",
  ],
  spotify: {
    // Add your public Spotify app Client ID and playlist ID. Never put a client secret here.
    clientId: "",
    playlistId: "",
    accessToken: "",
    tracks: [
      { title: "Our Song", artist: "The one that always finds us", art: rooftop, isOurSong: true },
      { title: "Rain on the Window", artist: "For late-night drives", art: city, isOurSong: false },
      { title: "Sunday Coffee", artist: "For slow mornings", art: cafe, isOurSong: false },
    ],
  },
  bonus: {
    date: "2027-09-17T19:30:00",
    image: rooftop,
    message: "You found it. Just like I found you — not looking for it, but glad I did.",
  },
} as const;

export type RelationshipContent = typeof relationshipContent;
