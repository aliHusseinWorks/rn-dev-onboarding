#!/bin/sh
# RN dev setup - herdr desktop launcher
# Creates one launcher for herdr. Nothing else is touched. Run it from the page:
#   curl -fsSL https://rn-dev-onboarding.pages.dev/herdr-launcher.sh | sh -s -- --dest ~/Desktop
set -e

DEST=
ICON_FILE=
ICON_URL=https://rn-dev-onboarding.pages.dev/herdr.png

while [ $# -gt 0 ]; do
  case "$1" in
    --dest) DEST=${2?value missing for --dest}; shift 2 ;;
    --icon-file) ICON_FILE=${2?value missing for --icon-file}; shift 2 ;;
    --icon-url) ICON_URL=${2?value missing for --icon-url}; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

HERDR=$(command -v herdr 2>/dev/null) || HERDR=
[ -n "$HERDR" ] || {
  echo "herdr is not on PATH - install it from the herdr card first, then run this again."
  exit 1
}

expand_tilde() {
  case "$1" in
    "~") printf '%s' "$HOME" ;;
    "~/"*) printf '%s/%s' "$HOME" "${1#"~/"}" ;;
    *) printf '%s' "$1" ;;
  esac
}

# The page substitutes its form values in, and leaves an unfilled {token} as-is.
DEFAULT_DEST=no
case "$DEST" in '' | \{*) DEST="$HOME/Desktop"; DEFAULT_DEST=yes ;; esac
DEST=$(expand_tilde "$DEST")

# Only the Desktop fallback is ours to create; a typed path that doesn't exist is
# a typo, and creating it would leave the user hunting for the launcher.
if [ "$DEFAULT_DEST" = yes ]; then mkdir -p "$DEST"; fi
if [ ! -d "$DEST" ]; then
  echo "The install folder does not exist: $DEST"
  echo "Create it first, or leave --dest off to use your Desktop."
  exit 1
fi

# Every exit below leaves through here, so no failure strands a temp file.
TMP=$(mktemp)
WORK=
trap 'rm -rf -- "$TMP" ${WORK:+"$WORK"}' EXIT

if [ -n "$ICON_FILE" ]; then
  if [ ! -f "$ICON_FILE" ]; then
    echo "Icon file not found: $ICON_FILE"
    echo "Point --icon-file at an image, or leave it off to use herdr's own icon."
    exit 1
  fi
  cp -- "$ICON_FILE" "$TMP"
else
  # Fetched aside and checked before it counts, so a bad response can't replace a
  # working icon. A missing asset answers with the SPA's HTML, so look for the PNG
  # signature rather than trusting the 200.
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$ICON_URL" -o "$TMP"
  else
    wget -qO "$TMP" "$ICON_URL"
  fi
  if [ "$(dd if="$TMP" bs=1 skip=1 count=3 2>/dev/null)" != PNG ]; then
    echo "That URL did not return an icon: $ICON_URL"
    exit 1
  fi
fi

if [ "$(uname -s)" = Darwin ]; then
  APP="$DEST/herdr.app"
  WORK=$(mktemp -d)

  # sips exits 0 on a file that is not an image, printing "<nil>" for the
  # dimensions, so the side is checked rather than trusted.
  SIDE=$(sips -g pixelWidth -g pixelHeight "$TMP" 2>/dev/null |
    awk '/pixelWidth|pixelHeight/ { if ($2 + 0 > m) m = $2 + 0 } END { print m }')
  case $SIDE in
    '' | 0 | *[!0-9]*)
      echo "That icon is not an image macOS can read: ${ICON_FILE:-$ICON_URL}"
      echo "Point --icon-file at a PNG, or leave it off to use herdr's own icon."
      exit 1 ;;
  esac

  # sips converts to icns only from a square whose side is a standard icon size.
  # Padding rather than scaling keeps a non-square logo undistorted, and its alpha.
  sips -p "$SIDE" "$SIDE" "$TMP" --out "$WORK/square.png" >/dev/null 2>&1
  mkdir -p "$WORK/herdr.iconset"
  for s in 16 32 128 256 512; do
    sips -z "$s" "$s" "$WORK/square.png" --out "$WORK/herdr.iconset/icon_${s}x${s}.png" >/dev/null 2>&1
  done
  iconutil -c icns "$WORK/herdr.iconset" -o "$WORK/herdr.icns" || {
    echo "Could not turn that image into a macOS icon: ${ICON_FILE:-$ICON_URL}"
    exit 1
  }

  # CFBundleExecutable has to be a Mach-O or Launch Services refuses the bundle
  # with -10669, so Apple's own applet supplies it.
  osacompile -o "$WORK/herdr.app" \
    -e 'do shell script "open -a Terminal " & quoted form of (POSIX path of (path to me) & "Contents/Resources/herdr-run")' >/dev/null 2>&1 || {
    echo "Could not build the launcher: osacompile failed."
    exit 1
  }

  # herdr's absolute path, quoted, because Terminal runs this with /bin/sh, which
  # never sources the profile that puts ~/.local/bin on PATH. The Windows shortcut
  # pins its target for the same reason.
  printf '#!/bin/sh\ncd "$HOME"\nexec "%s"\n' "$HERDR" > "$WORK/herdr.app/Contents/Resources/herdr-run"
  chmod +x "$WORK/herdr.app/Contents/Resources/herdr-run"

  cp -- "$WORK/herdr.icns" "$WORK/herdr.app/Contents/Resources/applet.icns"
  # CFBundleIconName points at an asset catalogue and outranks CFBundleIconFile,
  # so both have to go before the icns is read at all.
  plutil -remove CFBundleIconName "$WORK/herdr.app/Contents/Info.plist" >/dev/null 2>&1 || true
  rm -f -- "$WORK/herdr.app/Contents/Resources/Assets.car"
  # An icon is cached against the bundle, so the version carries the icon's own
  # bytes to keep a rebuild from showing the previous image.
  plutil -replace CFBundleVersion -string "$(cksum < "$WORK/herdr.icns" | cut -d' ' -f1)" \
    "$WORK/herdr.app/Contents/Info.plist"

  # Swapped in last, so any failure above leaves an existing launcher alone.
  rm -rf -- "$APP"
  mv -- "$WORK/herdr.app" "$APP" || {
    echo "Could not write the launcher to $DEST"
    echo "Check that folder is writable, then run this again."
    exit 1
  }
  # Replacing a resource invalidates the signature osacompile applied.
  codesign --force -s - "$APP" >/dev/null 2>&1 || true

  echo "Created $APP"
  if [ -e "$DEST/herdr.command" ]; then
    echo "An earlier herdr.command is still there; delete it if you don't want two launchers."
  fi
  exit 0
fi

ICON_DIR="$HOME/.local/share/icons"
mkdir -p "$ICON_DIR"

# Named after its own bytes, so a changed icon means a changed path and no desktop
# environment can serve a cached thumbnail of the previous one. Copied inside the
# target directory and renamed, because that name follows the bytes: a partial copy
# would occupy the path a retry computes, and the cache would keep serving it.
ICON="$ICON_DIR/herdr-$(cksum < "$TMP" | cut -d' ' -f1).png"
cp -- "$TMP" "$ICON.part"
chmod 644 "$ICON.part"
mv -- "$ICON.part" "$ICON"

# No Path= key: herdr restores its own workspaces, so pinning a working directory
# here would only ever affect a first-ever launch.
printf '[Desktop Entry]\nType=Application\nName=herdr\nExec=herdr\nIcon=%s\nTerminal=true\n' "$ICON" > "$DEST/herdr.desktop"
chmod +x "$DEST/herdr.desktop"
echo "Created $DEST/herdr.desktop"
