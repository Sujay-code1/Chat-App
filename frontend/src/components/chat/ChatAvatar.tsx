const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export default function ChatAvatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: "normal" | "large";
}) {
  return (
    <div className={`avatar ${size === "large" ? "avatar-large" : ""}`}>
      <span>{initials(name)}</span>
    </div>
  );
}
