'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// GSAP for the landing page's motion graphics (ADR-048). Plugins are
// registered once here; every scene imports from this file.
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  SplitText,
  MotionPathPlugin,
  DrawSVGPlugin,
);

// Scenes animate only for visitors who haven't asked for less motion;
// the others see each scene's finished state.
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

export { gsap, ScrollTrigger, SplitText, useGSAP };
