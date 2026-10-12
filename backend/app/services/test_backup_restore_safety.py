"""Pure unit tests: no connections, no MySQL operations, no file writes."""

import unittest

from backup_restore_safety import (
    new_restore_target,
    require_owned_cleanup_target,
    validate_restore_target,
)


BASE = dict(production_database="glisen_erp", production_user="glisen_app",
            test_database="glisen_verify_aabbccddeeff", test_user="glisen_verify_user")


class RestoreSafetyTests(unittest.TestCase):
    def test_isolated_target_accepted(self):
        target = validate_restore_target(**BASE)
        self.assertEqual(target.test_database, BASE["test_database"])

    def test_cannot_reuse_production_user(self):
        with self.assertRaisesRegex(ValueError, "production MySQL account"):
            validate_restore_target(**{**BASE, "test_user": "GLISEN_APP"})

    def test_cannot_target_production_or_random_database(self):
        for name in ("glisen_erp", "other_company", "glisen_verify_123", "glisen_verify_123456789abc;DROP"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                validate_restore_target(**{**BASE, "test_database": name})

    def test_generates_unique_test_names(self):
        a = new_restore_target(production_database="glisen_erp", production_user="glisen_app",
                               test_user="glisen_verify_user")
        b = new_restore_target(production_database="glisen_erp", production_user="glisen_app",
                               test_user="glisen_verify_user")
        self.assertNotEqual(a.test_database, b.test_database)
        self.assertTrue(a.test_database.startswith("glisen_verify_"))

    def test_cleanup_only_the_created_database(self):
        target = validate_restore_target(**BASE)
        require_owned_cleanup_target(target, created_database=target.test_database,
                                     database_to_drop=target.test_database)
        for attempted in ("glisen_erp", "other_company", "glisen_verify_111111111111"):
            with self.subTest(attempted=attempted), self.assertRaises(ValueError):
                require_owned_cleanup_target(target, created_database=target.test_database,
                                             database_to_drop=attempted)
        with self.assertRaises(ValueError):
            require_owned_cleanup_target(target, created_database="glisen_verify_000000000000",
                                         database_to_drop=target.test_database)


if __name__ == "__main__":
    unittest.main()
