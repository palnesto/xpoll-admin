export function extractYouTubeId(input: string) {
  const idLike = /^[\w-]{11}$/;
  try {
    if (idLike.test(input)) return input;
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return idLike.test(id) ? id : input;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || "";
      return idLike.test(id) ? id : input;
    }
  } catch {
    // non-url, fallthrough
  }
  return input;
}
