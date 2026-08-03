// Single seam for real subscription status once payments are wired up.
// Every "Go Premium" badge/prompt in the app reads this instead of a local
// prop, so flipping this over to a real check (context, API call, cached
// claim from the auth token, etc.) needs no changes at any call site —
// premium users will just stop seeing the upgrade prompts automatically.
export default function useIsPremiumUser() {
  return false;
}
