"""Tests use synthetic values assembled at runtime; no real identifiers are retained."""
import json
import unittest
from privacy_audit import inspect

class PrivacyGuardTests(unittest.TestCase):
    def test_synthetic_sensitive_fields(self):
        result = inspect("src/data/sample.json", json.dumps({"reference": "not-public", "passportNumber": "not-public"}).encode())
        self.assertIn("populated private identity/booking field", result)

    def test_fictional_references_and_public_travel_fields(self):
        result = inspect("tests/fixture.json", json.dumps({"reference":"TEST-FICTIONAL", "name":"Fictional Hotel", "number":"SQ108", "date":"2027-01-28"}).encode())
        self.assertEqual(result, set())

    def test_credential_and_card_detection(self):
        token = "gh" + "p_" + "A" * 36
        self.assertIn("credential/private-key pattern", inspect("sample.txt", token.encode()))
        card = "4" + "111" * 5
        self.assertIn("possible payment card number", inspect("sample.txt", card.encode()))

    def test_docs_and_email_detection(self):
        self.assertTrue(inspect("private/booking.pdf", b"synthetic"))
        address = "fictional" + "@" + "private.invalid"
        self.assertIn("email address", inspect("sample.txt", address.encode()))

    def test_svg_geometry_does_not_trigger_card_alarm(self):
        self.assertEqual(inspect("public/icon.svg", b'<svg><path d="M4 111 111 111 111 111"/></svg>'), set())

if __name__ == "__main__":
    unittest.main()
