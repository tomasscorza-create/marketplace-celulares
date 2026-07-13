import { useEffect, useMemo, useState } from "react";

type UserAvatarProps = {
  imageUrl?: string | null;
  label: string;
  sizeClassName?: string;
  textClassName?: string;
};

export function UserAvatar({
  imageUrl,
  label,
  sizeClassName = "h-11 w-11",
  textClassName = "text-sm",
}: UserAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const initial = label.trim().charAt(0).toUpperCase() || "U";
  const normalizedImageUrl = useMemo(() => {
    const trimmedImageUrl = imageUrl?.trim() ?? "";

    return trimmedImageUrl.length > 0 ? trimmedImageUrl : null;
  }, [imageUrl]);

  useEffect(() => {
    setHasImageError(false);
  }, [normalizedImageUrl]);

  if (normalizedImageUrl && !hasImageError) {
    return (
      <img
        alt={label}
        className={`${sizeClassName} rounded-full object-cover`}
        decoding="async"
        loading="eager"
        onError={() => {
          setHasImageError(true);
        }}
        src={normalizedImageUrl}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full bg-brand-500 font-semibold text-white ${sizeClassName} ${textClassName}`}
    >
      {initial}
    </span>
  );
}
