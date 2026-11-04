import tempfile
import unittest
from pathlib import Path

from generate_quality_reports import collect_metrics, compute_verdict, generate, parse_suite


class QualityReportTests(unittest.TestCase):
    def test_junit_counts_statuses_duration_and_success_rate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = root / "results.xml"
            report.write_text(
                '<testsuites time="2.0"><testsuite tests="3" failures="1" skipped="1">'
                '<testcase classname="sample" name="ok" time="0.5" />'
                '<testcase classname="sample" name="broken" time="0.7"><failure message="assertion failed" /></testcase>'
                '<testcase classname="sample" name="later" time="0.3"><skipped /></testcase>'
                '</testsuite></testsuites>',
                encoding="utf-8",
            )

            suite = parse_suite(root, "sample", "Sample", "results.xml")

        self.assertEqual((suite["passed"], suite["failed"], suite["skipped"]), (1, 1, 1))
        self.assertEqual(suite["status"], "failed")
        self.assertEqual(suite["duration_seconds"], 2.0)
        self.assertEqual(suite["success_rate"], 0.5)
        self.assertEqual(suite["test_cases"][1]["detail"], "assertion failed")

    def test_reads_coverage_summary_from_instrumented_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            coverage = root / "backend/demand-service/coverage-unit"
            coverage.mkdir(parents=True)
            (coverage / "coverage-summary.json").write_text(
                '{"total":{"statements":{"pct":90.09},"branches":{"pct":92.23},'
                '"functions":{"pct":89.23},"lines":{"pct":92.08}}}',
                encoding="utf-8",
            )

            metrics = collect_metrics(root)

        self.assertEqual(metrics["coverage"]["lines"], 92.08)

    def test_missing_suite_is_not_reported_as_passed(self):
        with tempfile.TemporaryDirectory() as directory:
            suite = parse_suite(Path(directory), "sample", "Sample", "missing.xml")

        self.assertEqual(suite["status"], "not_run")
        self.assertIsNone(suite["success_rate"])

    def test_runner_failure_without_junit_is_visible_without_inventing_failed_cases(self):
        with tempfile.TemporaryDirectory() as directory:
            metrics = collect_metrics(Path(directory), {"mobile": "failure"})

        mobile = metrics["suites"][0]
        self.assertEqual(mobile["status"], "failed")
        self.assertTrue(mobile["runner_error"])
        self.assertEqual(mobile["failed"], 0)
        self.assertIsNone(mobile["success_rate"])

    def test_successful_runner_without_junit_is_reported_as_missing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            metrics = collect_metrics(Path(directory), {"mobile": "success"})

        self.assertEqual(metrics["suites"][0]["status"], "report_missing")

    def test_generate_writes_both_html_reports_even_without_test_xml(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            metrics = generate(root)
            output = root / "quality-reports"

            self.assertTrue((output / "metrics.json").is_file())
            self.assertTrue((output / "technical-report.html").is_file())
            self.assertTrue((output / "business-report.html").is_file())
            self.assertEqual(metrics["totals"]["failed"], 0)
            self.assertIsNone(metrics["totals"]["success_rate"])

    def test_failed_test_is_in_technical_report_and_both_reports_are_written(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = root / "relatorios/mobile/unit-mobile.xml"
            report.parent.mkdir(parents=True)
            report.write_text(
                '<testsuites time="0.4"><testsuite><testcase classname="mobile" name="invalid input">'
                '<failure message="expected valid value" /></testcase></testsuite></testsuites>',
                encoding="utf-8",
            )
            generate(root)
            output = root / "quality-reports"

            technical = (output / "technical-report.html").read_text(encoding="utf-8")
            business = (output / "business-report.html").read_text(encoding="utf-8")

        self.assertIn("invalid input", technical)
        self.assertIn("expected valid value", technical)
        self.assertIn("1</strong></div>", business)

    def test_verdict_is_red_when_any_suite_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            metrics = collect_metrics(Path(directory), {"mobile": "failure"})
        self.assertEqual(metrics["verdict"]["level"], "red")

    def test_verdict_is_gray_without_any_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            metrics = collect_metrics(Path(directory))
        self.assertEqual(metrics["verdict"]["level"], "gray")

    def test_verdict_is_green_only_when_all_pass_and_coverage_meets_target(self):
        suites = [{"name": "A", "status": "passed", "failed": 0}]
        self.assertEqual(compute_verdict(suites, {"lines": 92.0})["level"], "green")
        self.assertEqual(compute_verdict(suites, {"lines": 50.0})["level"], "yellow")
        self.assertEqual(compute_verdict(suites, None)["level"], "yellow")

    def test_business_report_shows_verdict_and_pending_features(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".github").mkdir()
            (root / ".github/quality-context.json").write_text(
                '{"pending_features":[{"id":"C3","title":"Busca","impact":"Sem busca."}]}', encoding="utf-8"
            )
            generate(root)
            business = (root / "quality-reports/business-report.html").read_text(encoding="utf-8")
        self.assertIn("Situação geral da qualidade", business)
        self.assertIn("C3 — Busca", business)


if __name__ == "__main__":
    unittest.main()