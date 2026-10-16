// Testimonials copy, media and per-video framing. Card 2 (Elovate) has the
// real thumbnail and logo but dummy text until the owner sends the copy.
import ellingtonVideo from './videos/ellington-pens.mp4?url';
import elovateVideo from './videos/elovate-testimonial.mp4?url';
import ellingtonThumb from './assets/testimonials/thumb-ellington.webp?url';
import elovateThumb from './assets/testimonials/thumb-elovate.webp?url';
import ellingtonLogo from './assets/testimonials/logo-ellington.webp?url';
import elovateLogo from './assets/testimonials/logo-elovate.webp?url';

export interface Testimonial {
  id: string;
  video: string;
  /** WebVTT subtitles; shown in the caption spot while the video plays. */
  subtitles?: string;
  /** object-position for the video: the phone clips are taller than the card. */
  videoFocus: string;
  thumb: string;
  thumbAlt: string;
  /** The line over the thumbnail (Figma's caption). */
  stillText: string;
  quote: string;
  name: string;
  role: string;
  logo: string;
  logoAlt: string;
  /** Figma crops the Ellington logo PNG inside its box; others just fit. */
  logoCrop: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'ellington',
    video: ellingtonVideo,
    videoFocus: '50% 72%',
    thumb: ellingtonThumb,
    thumbAlt: 'Jamal, founder of Ellington Pens',
    stillText: "We've been working for the last 8 months",
    quote:
      '“We’ve been working with DigitFruition for 8 months, and they’ve transformed our entire PPC strategy. Our monthly revenue went from $70K to $195K, profit nearly tripled and our TACOS has come down. Nojus isn’t just clicking buttons — he’s a strategist, and that’s rare to find.”',
    name: 'Jamal',
    role: 'Founder - Ellington Pens',
    logo: ellingtonLogo,
    logoAlt: 'Ellington Pens',
    logoCrop: true,
  },
  {
    id: 'elovate',
    video: elovateVideo,
    videoFocus: '50% 35%',
    thumb: elovateThumb,
    thumbAlt: 'Founder of Elovate',
    stillText: 'Placeholder caption for the second video',
    quote:
      '“Placeholder quote for the second testimonial. The real copy will replace this text: what changed after working with DigitFruition, the numbers that moved, and what it was like to work together.”',
    name: 'Name Surname',
    role: 'Founder - Elovate',
    logo: elovateLogo,
    logoAlt: 'Elovate',
    logoCrop: false,
  },
];
