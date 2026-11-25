// Shared control classes. Tailwind v4 has no default control border and no default ring width, so both are explicit.
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const button = `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${focus}`;
const textButton = `inline-flex min-h-6 items-center rounded-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${focus}`;

export const labelClass = "block text-sm font-medium text-gray-700";
export const inputClass = `block w-full rounded-md border border-gray-500 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-500 sm:text-sm ${focus}`;
export const primaryButton = `${button} bg-blue-600 text-white hover:bg-blue-700`;
export const secondaryButton = `${button} bg-gray-100 text-gray-700 hover:bg-gray-200`;
export const dangerButton = `${button} bg-red-700 text-white hover:bg-red-800`;
export const linkButton = `${textButton} text-blue-700 hover:text-blue-900`;
export const dangerLinkButton = `${textButton} text-red-700 hover:text-red-900`;
