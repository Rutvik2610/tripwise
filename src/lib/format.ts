export const dateLabel = (s: string) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not scheduled";
export const shortDate = (s: string) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "Unscheduled";
export const safeUrl = (s: string) => {
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
};
