import json
import tempfile
import unittest
from pathlib import Path

from generate_quality_reports import collect_metrics, compute_verdict, generate, parse_suite, render_report


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

    def test_summary_comes_first_and_pending_features_are_not_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".github").mkdir()
            (root / ".github/quality-context.json").write_text(
                '{"pending_features":[{"id":"C3","title":"Busca","impact":"Sem busca."}]}', encoding="utf-8"
            )
            generate(root)
            for name in ("business-report.html", "technical-report.html"):
                page = (root / "quality-reports" / name).read_text(encoding="utf-8")
                self.assertIn("Resumo da execução", page)
                self.assertLess(page.index("Resumo da execução"), page.index("<h2>", page.index("Resumo da execução") + 30))
                self.assertNotIn("C3 — Busca", page)
                self.assertNotIn("falhas esperadas", page)

    def test_runner_error_never_yields_full_success_rate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = root / "relatorios/mobile/unit-mobile.xml"
            report.parent.mkdir(parents=True)
            report.write_text(
                '<testsuites><testsuite><testcase classname="m" name="ok" time="0.1" /></testsuite></testsuites>',
                encoding="utf-8",
            )
            metrics = collect_metrics(root, {"mobile": "success", "demand_unit": "failure"})
        self.assertEqual(metrics["totals"]["execution_errors"], 1)
        self.assertEqual(metrics["totals"]["success_rate"], 0.5)
        self.assertEqual(metrics["verdict"]["level"], "red")

    # --- Rótulos e mensagens que impedem ler "100%" como validação integral ---

    SUITE_FILES = {
        "mobile": "relatorios/mobile/unit-mobile.xml",
        "demand_unit": "backend/demand-service/relatorios/unit-demand.xml",
        "auth_api": "backend/auth-service/relatorios/api-auth.xml",
        "demand_api": "backend/demand-service/relatorios/api-demand.xml",
        "e2e_smoke": "e2e/test-results/smoke-e2e.xml",
        "e2e_full": "e2e/test-results/regressao-e2e.xml",
    }

    def _write_suite(self, root, suite_id, passed, skipped=0):
        path = root / self.SUITE_FILES[suite_id]
        path.parent.mkdir(parents=True, exist_ok=True)
        cases = "".join(f'<testcase classname="s" name="ok{i}" time="0.1" />' for i in range(passed))
        cases += "".join(
            f'<testcase classname="s" name="skip{i}" time="0"><skipped message="fixme" /></testcase>'
            for i in range(skipped)
        )
        path.write_text(f'<testsuites time="1"><testsuite>{cases}</testsuite></testsuites>', encoding="utf-8")

    def _write_coverage(self, root, lines=92.0):
        path = root / "backend/demand-service/coverage-unit/coverage-summary.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        pct = {"pct": lines}
        path.write_text(
            json.dumps({"total": {"statements": pct, "branches": pct, "functions": pct, "lines": pct}}),
            encoding="utf-8",
        )

    def _generate_pages(self, root, suites, skipped_in=None):
        for suite_id in suites:
            self._write_suite(root, suite_id, 5, skipped=3 if suite_id == skipped_in else 0)
        self._write_coverage(root)
        metrics = collect_metrics(root, {suite_id: "success" for suite_id in suites})
        return metrics, {
            "technical": render_report(metrics, True),
            "business": render_report(metrics, False),
        }

    def test_labels_state_that_rate_covers_only_executed_tests(self):
        with tempfile.TemporaryDirectory() as directory:
            _, pages = self._generate_pages(Path(directory), ["mobile"])
        for page in pages.values():
            self.assertIn("Taxa de sucesso (apenas testes executados)", page)
            self.assertIn("Ignorados (não executados)", page)
            self.assertNotIn("<span>Taxa de sucesso</span>", page)
            self.assertNotIn("<span>Skipped</span>", page)
            self.assertIn("ficam fora os testes ignorados e as suites não executadas", page)
            self.assertIn("falha esperada (test.fail)", page)
            self.assertIn("Playwright/JUnit", page)
            self.assertNotIn("test.fail() = aprovado", page)

    def test_coverage_titles_state_the_instrumented_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            _, pages = self._generate_pages(Path(directory), ["mobile"])
        scope = "somente o código instrumentado do demand-service; não representa a cobertura de todo o produto"
        self.assertIn(f"<h2>Cobertura instrumentada ({scope})</h2>", pages["technical"])
        self.assertIn(f"<h2>Cobertura de código ({scope})</h2>", pages["business"])

    def test_table_headers_say_rate_of_executed_tests(self):
        with tempfile.TemporaryDirectory() as directory:
            _, pages = self._generate_pages(Path(directory), ["mobile"])
        for page in pages.values():
            self.assertIn("<th>Taxa (executados)</th>", page)
            self.assertNotIn("<th>Taxa de sucesso</th>", page)

    def test_full_rate_with_ignored_tests_and_missing_suite_warns_about_partial_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            metrics, pages = self._generate_pages(
                Path(directory), ["mobile", "demand_unit", "auth_api", "demand_api"], skipped_in="demand_unit"
            )
        self.assertEqual(metrics["totals"]["success_rate"], 1.0)
        for page in pages.values():
            self.assertIn('class="alert"', page)
            self.assertIn("Existem cenários ignorados ou não executados.", page)
            self.assertIn("não representa validação integral dos cenários planejados", page)
            self.assertIn("3 teste(s) ignorado(s)", page)
            self.assertIn("Smoke E2E, Regressão E2E", page)

    def test_warning_appears_with_only_ignored_tests_or_only_missing_suites(self):
        every_suite = list(self.SUITE_FILES)
        with tempfile.TemporaryDirectory() as directory:
            _, only_ignored = self._generate_pages(Path(directory), every_suite, skipped_in="mobile")
        with tempfile.TemporaryDirectory() as directory:
            _, only_missing = self._generate_pages(Path(directory), every_suite[:-1])
        for pages in (only_ignored, only_missing):
            for page in pages.values():
                self.assertIn('class="alert"', page)

    def test_fully_executed_green_run_has_no_partial_validation_warning(self):
        with tempfile.TemporaryDirectory() as directory:
            metrics, pages = self._generate_pages(Path(directory), list(self.SUITE_FILES))
        self.assertEqual(metrics["verdict"]["level"], "green")
        self.assertEqual(metrics["totals"]["skipped"], 0)
        for page in pages.values():
            self.assertNotIn('class="alert"', page)
            self.assertNotIn("Existem cenários ignorados ou não executados", page)
            self.assertNotIn("Aprovado com ressalvas", page)

    def test_reports_never_list_static_pending_features(self):
        with tempfile.TemporaryDirectory() as directory:
            _, pages = self._generate_pages(Path(directory), ["mobile"], skipped_in="mobile")
        for page in pages.values():
            for forbidden in ("C3", "C5", "C6", "C9", "C10", "Cenários E2E pendentes"):
                self.assertNotIn(forbidden, page)


if __name__ == "__main__":
    unittest.main()