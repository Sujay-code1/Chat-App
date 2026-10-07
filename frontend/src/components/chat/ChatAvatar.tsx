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
  online = false,
}: {
  name: string;
  size?: "normal" | "large";
  online?: boolean;
}) {
  return (
    <div
      className={`avatar ${size === "large" ? "avatar-large" : ""}`}
      aria-label={online ? `${name} is online` : undefined}
    >
      <span>{initials(name)}</span>
      {online && <span className="avatar-presence" aria-hidden="true" />}
    </div>
  );
}
