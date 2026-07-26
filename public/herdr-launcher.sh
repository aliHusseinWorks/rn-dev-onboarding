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

command -v herdr >/dev/null 2>&1 || {
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

if [ "$(uname -s)" = Darwin ]; then
  # A .command keeps the generic Terminal icon; stamping one needs an .app bundle.
  printf '#!/bin/sh\nexec herdr\n' > "$DEST/herdr.command"
  chmod +x "$DEST/herdr.command"
  echo "Created $DEST/herdr.command"
  exit 0
fi

ICON_DIR="$HOME/.local/share/icons"
mkdir -p "$ICON_DIR"
TMP="$ICON_DIR/herdr.download"
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
    rm -f "$TMP"
    echo "That URL did not return an icon: $ICON_URL"
    exit 1
  fi
fi

# Named after its own bytes, so a changed icon means a changed path and no desktop
# environment can serve a cached thumbnail of the previous one.
ICON="$ICON_DIR/herdr-$(cksum < "$TMP" | cut -d' ' -f1).png"
mv -- "$TMP" "$ICON"

# No Path= key: herdr restores its own workspaces, so pinning a working directory
# here would only ever affect a first-ever launch.
printf '[Desktop Entry]\nType=Application\nName=herdr\nExec=herdr\nIcon=%s\nTerminal=true\n' "$ICON" > "$DEST/herdr.desktop"
chmod +x "$DEST/herdr.desktop"
echo "Created $DEST/herdr.desktop"
