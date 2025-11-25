import os
import json
import time
from pathlib import Path
from openai import OpenAI

"""describe_faces_svgs.py

Place this script in the facesjs `svg/` directory.
It will:
- scan all subdirectories (each is a category: head, nose, mouth, hair, ...)
- for each *.svg file, call gpt-5-mini via the Responses API
- ask the model to return a JSON description (id, category, short_label, description, tags)
- write all results to faces_descriptions.json

This version avoids `response_format` (which caused your error) and instead
asks the model to return JSON as plain text, then parses it with json.loads.
So it works even if your OpenAI Python client version does not support
structured outputs yet.
"""

# ---------------- CONFIG ----------------

SVG_ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = SVG_ROOT / "faces_descriptions.json"
MODEL = "gpt-5-mini"  # uses the Responses API



client = OpenAI(api_key="")


#  ---------------- STATIC BASE PROMPT ----------------

# IMPORTANT: this is a plain triple-quoted string, NOT an f-string.
# That means we can safely use `{` and `}` to show JSON structure without
# triggering Python's f-string formatting (which caused your 'Invalid format
# specifier' error before).
BASE_PROMPT = (
    "You are helping document SVG parts for an avatar library.\n\n"
    "Each SVG belongs to a category (like 'head', 'nose', 'mouth', 'hair', 'glasses')\n"
    "and has an internal ID (like 'head3', 'nose5', 'juice', 'glasses2-black').\n\n"
    "For each (category, id) pair, you must produce a SHORT, agent-friendly description\n"
    "that makes it easy for an AI system to reason about what this variant looks like\n"
    "and when it should be used.\n\n"
    "Constraints and behaviour:\n"
    "- You DO NOT see the actual SVG image. You only see the category and id.\n"
    "- Infer meaning from patterns in the id when possible (for example: 'nose9' vs 'nose1',\n"
    "  'head_round', 'juice', 'glasses2-black').\n"
    "- When it's ambiguous, make a reasonable, generic guess.\n"
    "- Focus on visual aspects: shape, size, style, emotion/attitude if relevant.\n"
    "- Output must be STRICT, VALID JSON. No comments. No trailing commas. No extra text.\n\n"
    "Your output MUST be exactly one JSON object with this structure (field names and types):\n"
    "{\n"
    "  \"id\": string,               // the original svg id (exactly as given)\n"
    "  \"category\": string,         // the original category (exactly as given)\n"
    "  \"short_label\": string,      // very short human-readable label (max ~5 words)\n"
    "  \"description\": string,      // 1–3 sentences describing the visual style\n"
    "  \"tags\": string[]            // 3–8 semantic tags, e.g. [\"long\", \"round\", \"serious\"]\n"
    "}\n\n"
    "Return ONLY the JSON object, nothing else."
)


# ---------------- DISCOVERY ----------------

def discover_svg_ids(root: Path) -> dict[str, list[str]]:
    """Discover all SVG files for each category (subdirectory name).

    Example structure:
        svg/
          head/
            head1.svg
            head2.svg
          nose/
            nose1.svg
            nose2.svg

    Returns a dict like:
        {
          "head": ["head1", "head2"],
          "nose": ["nose1", "nose2"],
          ...
        }
    """
    ids_by_category: dict[str, list[str]] = {}

    for subdir in root.iterdir():
        if not subdir.is_dir():
            continue
        if subdir.name.startswith(".") or subdir.name in {"__pycache__"}:
            continue

        category = subdir.name
        ids: list[str] = []
        for svg_path in subdir.glob("*.svg"):
            svg_id = svg_path.stem  # filename without .svg
            ids.append(svg_id)

        if ids:
            ids_by_category[category] = sorted(ids)

    return ids_by_category


# ---------------- OPENAI CALL ----------------

def describe_variant(category: str, svg_id: str) -> dict:
    """Ask gpt-5-mini for an AI-agent-friendly description of one SVG.

    We use the Responses API (`client.responses.create`) and instruct the
    model to return a single JSON object as plain text, then parse it.

    This follows the official pattern from the openai-python README:
        response = client.responses.create(model="gpt-4o", input="...")
        print(response.output_text)
    """

    # Append the specific category/id to the static base prompt.
    prompt = (
        BASE_PROMPT
        + f"\n\nNow describe this variant:\n"
        + f"category: \"{category}\"\n"
        + f"id: \"{svg_id}\""
    )

    response = client.responses.create(
        model=MODEL,
        input=prompt,
    )

    # In the Responses API, free-form text is conveniently exposed as output_text.
    text = response.output_text

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        # If the model ever returns invalid JSON, this error will show the raw output
        # so you can inspect and adjust the prompt if needed.
        raise RuntimeError(
            f"Failed to parse JSON for {category}/{svg_id}: {e}\n"
            f"Raw model output:\n{text}"
        )

    return data


# ---------------- MAIN ----------------

def main() -> None:
    ids_by_category = discover_svg_ids(SVG_ROOT)
    if not ids_by_category:
        raise SystemExit(f"No SVGs found under {SVG_ROOT}")

    # Load existing descriptions if present so we can resume incrementally
    if OUTPUT_PATH.exists():
        with OUTPUT_PATH.open("r", encoding="utf-8") as f:
            results: dict[str, dict[str, dict]] = json.load(f)
    else:
        results = {}

    for category, ids in ids_by_category.items():
        print(f"\n=== Category: {category} ({len(ids)} svg files) ===")

        if category not in results:
            results[category] = {}

        for svg_id in ids:
            if svg_id in results[category]:
                print(f"  → Skipping {category}/{svg_id} (already described)")
                continue

            print(f"  → Describing {category}/{svg_id} ... ", end="", flush=True)
            try:
                desc = describe_variant(category, svg_id)
            except Exception as e:
                print(f"ERROR: {e}")
                # Continue with the next one
                continue

            results[category][svg_id] = desc
            print("ok")

            # Small delay to be nice to the API; adjust as needed
            time.sleep(0.25)

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Wrote descriptions to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
