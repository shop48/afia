/**
 * Framer Motion animation presets for Project Afia
 * Based on UX Guidelines: "smooth = secure" perception
 */

// --- Page Transitions ---
export const pageTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.3, ease: 'easeOut' },
}

// --- Fade In (default) ---
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4 },
}

// --- Slide Up (cards, modals) ---
export const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 24 },
}

// --- Scale In (badges, pills) ---
export const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 400, damping: 20 },
}

// --- Stagger Children (lists, grids) ---
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.06,
        },
    },
}

export const staggerItem = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
}

// --- Hover Effects ---
export const hoverLift = {
    whileHover: { y: -4, boxShadow: '0 12px 24px -6px rgb(0 0 0 / 0.12)' },
    transition: { type: 'spring', stiffness: 300, damping: 18 },
}

export const hoverGlow = {
    whileHover: { boxShadow: '0 0 20px 4px rgb(197 160 89 / 0.25)' },
    transition: { duration: 0.2 },
}

// --- Tap Effect ---
export const tapShrink = {
    whileTap: { scale: 0.97 },
}

// --- Circular Progress (Gold ring loader) ---
export const spinRotate = {
    animate: { rotate: 360 },
    transition: { duration: 1, repeat: Infinity, ease: 'linear' },
}
