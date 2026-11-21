#!/usr/bin/env python3
"""Repository publication guard. Reports paths/categories only, never matched values."""
import argparse
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCUMENTS = {".pdf", ".doc", ".docx", ".heic", ".p12", ".pfx", ".pem", ".key"}
PRIVATE_KEYS = {"reference", "receipt", "pnr", "bookingreference", "ticketnumber", "passportnumber", "passengername", "fullname", "dateofbirth", "birthdate", "personaladdress", "phone", "email", "transactionid", "paymentreference", "confirmationnumber"}
SECRET = re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9]{32,}")
EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
ASSIGNMENT = re.compile(r"""(?i)\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']([^"'\n]{8,})["']""")
IDENTIFIER = re.compile(r"""(?i)(?:[,{]\s*|[.]\s*|\b(?:const|let|var)\s+)(?:reference|pnr|passportNumber|ticketNumber|transactionId|confirmationNumber)\s*[:=]\s*["']([^"'\n]+)["']""")
LABELED_PRIVATE = re.compile(r"(?i)\b(?:PNR|passport|e-ticket|confirmation|transaction)\s*(?:number|reference|ID|no[.])?\s*[:#]\s*([A-Z0-9][A-Z0-9-]{4,})")
CARD = re.compile(r"(?<![A-Za-z0-9])(?:\d[ -]?){13,19}(?![A-Za-z0-9])")

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, stderr=subprocess.DEVNULL)

def account_tokens():
    # Detect the repository account identifier without embedding anyone's name
    # in this source file. A local/offline clone without a remote is still supported.
    try:
        remote = git("remote", "get-url", "origin").decode()
        match = re.search(r"github[.]com[:/]([^/]+)/", remote, re.I)
        if match:
            owner = match.group(1)
            stem = re.sub(r"[0-9_-]+$", "", owner)
            return [token for token in {owner, stem} if len(token) >= 4 and token.lower() not in {"owner", "username", "example"}]
    except subprocess.CalledProcessError:
        pass
    return []

ACCOUNT_TOKENS = account_tokens()

def fictional(value):
    return isinstance(value, str) and value.startswith(("TEST-", "EXAMPLE-", "<"))

def luhn(value):
    digits = [int(c) for c in value if c.isdigit()]
    if not 13 <= len(digits) <= 19 or len(set(digits)) < 2:
        return False
    total = 0
    for i, digit in enumerate(reversed(digits)):
        if i % 2:
            digit *= 2
            digit = digit - 9 if digit > 9 else digit
        total += digit
    return total % 10 == 0

def inspect(path, data):
    findings = set()
    suffix = pathlib.PurePosixPath(path).suffix.lower()
    if suffix in DOCUMENTS or re.search(r"(?i)(passport|boarding[-_ ]?pass|booking[-_ ]?confirmation|visa[-_ ]?scan).+\.(png|jpe?g|webp)$", path):
        findings.add("private document/key file requires removal or manual review")
    if pathlib.PurePosixPath(path).name.startswith(".env") and not path.endswith((".example", ".sample")):
        findings.add("environment configuration")
    if b"\x00" in data:
        return findings
    text = data.decode("utf-8", errors="replace")
    if any(re.search(re.escape(token), text, re.I) for token in ACCOUNT_TOKENS):
        findings.add("repository account/name token")
    if SECRET.search(text):
        findings.add("credential/private-key pattern")
    if any(not fictional(m.group(1)) for m in ASSIGNMENT.finditer(text)):
        findings.add("possible credential assignment")
    if any(not fictional(m.group(1)) for m in IDENTIFIER.finditer(text)):
        findings.add("non-fictional booking/identity identifier literal")
    if any(not fictional(m.group(1)) for m in LABELED_PRIVATE.finditer(text)):
        findings.add("labelled booking/identity identifier")
    if path != "package-lock.json" and any(not m.group().lower().endswith(("@example.com", "@example.org", "@example.invalid")) for m in EMAIL.finditer(text)):
        findings.add("email address")
    # SVG path coordinates are numeric geometry, not card-number text.
    card_text = re.sub(r"<[^>]+>", " ", text) if suffix == ".svg" else text
    if any(luhn(m.group()) for m in CARD.finditer(card_text)):
        findings.add("possible payment card number")
    if re.search(r'(?i)(?:tel:|phone\s*[:=]\s*["\x27])\+?\d[\d ()-]{7,}', text):
        findings.add("personal phone number")
    if suffix == ".json" and path != "package-lock.json":
        try:
            def walk(value):
                if isinstance(value, dict):
                    for key, v in value.items():
                        if key.lower().replace("_", "") in PRIVATE_KEYS and v and not fictional(v):
                            findings.add("populated private identity/booking field")
                        walk(v)
                elif isinstance(value, list):
                    for v in value:
                        walk(v)
            walk(json.loads(text))
        except (ValueError, TypeError):
            findings.add("JSON could not be audited")
    return findings

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staged", action="store_true")
    parser.add_argument("--history", action="store_true")
    args = parser.parse_args()
    findings = set()
    paths = git("ls-files", "-z").decode().split("\0")
    if not args.staged:
        paths += git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0")
    for path in sorted(set(filter(None, paths))):
        try:
            data = git("show", ":" + path) if args.staged else (ROOT / path).read_bytes()
        except (OSError, subprocess.CalledProcessError):
            continue
        for category in inspect(path, data):
            findings.add((path, category))
    commits = []
    if args.history:
        commits = git("rev-list", "--all").decode().splitlines()
        seen = set()
        for commit in commits:
            for entry in git("ls-tree", "-r", "-z", commit).split(b"\0"):
                if not entry:
                    continue
                meta, path_bytes = entry.split(b"\t", 1)
                blob = meta.split()[-1].decode()
                path = path_bytes.decode(errors="replace")
                if (blob, path) in seen:
                    continue
                seen.add((blob, path))
                for category in inspect(path, git("cat-file", "blob", blob)):
                    findings.add((path, "history: " + category))
        metadata = git("log", "--all", "--format=%an <%ae>%n%cn <%ce>").decode(errors="replace")
        if EMAIL.search(metadata):
            print("NOTICE: Existing Git author/committer metadata contains identity information. History was not changed.")
    for path, category in sorted(findings):
        print(f"{path}: {category}")
    print(f"Audited {len(set(filter(None, paths)))} current paths" + (f" and {len(commits)} accessible commits" if args.history else "") + f"; {len(set(p for p, _ in findings))} paths need review.")
    print("Scope: obvious patterns and structured private fields; manual review is still required for names, free text, images and remote copies.")
    return 1 if findings else 0

if __name__ == "__main__":
    sys.exit(main())
