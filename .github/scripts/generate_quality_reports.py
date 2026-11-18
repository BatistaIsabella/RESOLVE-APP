import html
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


SUITES = [
    ("mobile", "Unitários mobile", "relatorios/mobile/unit-mobile.xml"),
    ("demand_unit", "Unitários demand-service", "backend/demand-service/relatorios/unit-demand.xml"),
    ("auth_api", "API auth-service", "backend/auth-service/relatorios/api-auth.xml"),
    ("demand_api", "API demand-service", "backend/demand-service/relatorios/api-demand.xml"),
    ("e2e_smoke", "Smoke E2E", "e2e/test-results/smoke-e2e.xml"),
    ("e2e_full", "Regressão E2E", "e2e/test-results/regressao-e2e.xml"),
]
COVERAGE_PATH = "backend/demand-service/coverage-unit/coverage-summary.json"


def _number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def parse_suite(root, suite_id, name, relative_path):
    path = root / relative_path
    result = {
        "id": suite_id,
        "name": name,
        "source": relative_path,
        "status": "not_run",
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "duration_seconds": 0.0,
        "success_rate": None,
        "test_cases": [],
        "parse_error": None,
    }
    if not path.is_file():
        return result

    try:
        xml_root = ET.parse(path).getroot()
    except (ET.ParseError, OSError) as error:
        result["status"] = "report_error"
        result["parse_error"] = str(error)
        return result

    case_durations = []
    for case in xml_root.iter("testcase"):
        failure = case.find("failure")
        error = case.find("error")
        skipped = case.find("skipped")
        if failure is not None or error is not None:
            status = "failed"
            problem = failure if failure is not None else error
            detail = problem.get("message", "") or (problem.text or "")
        elif skipped is not None:
            status = "skipped"
            detail = skipped.get("message", "") or (skipped.text or "")
        else:
            status = "passed"
            detail = ""

        result[status] += 1
        duration = _number(case.get("time"))
        case_durations.append(duration)
        result["test_cases"].append(
            {
                "name": case.get("name", "(sem nome)"),
                "class_name": case.get("classname", ""),
                "status": status,
                "duration_seconds": duration,
                "detail": detail.strip(),
            }
        )

    result["status"] = "failed" if result["failed"] else "passed"
    reported_duration = _number(xml_root.get("time"))
    result["duration_seconds"] = reported_duration or sum(case_durations)
    executed = result["passed"] + result["failed"]
    if executed:
        result["success_rate"] = result["passed"] / executed
    return result


def read_coverage(root):
    path = root / COVERAGE_PATH
    if not path.is_file():
        return None
    try:
        summary = json.loads(path.read_text(encoding="utf-8"))
        total = summary.get("total", {})
        return {
            metric: total.get(metric, {}).get("pct")
            for metric in ("statements", "branches", "functions", "lines")
        }
    except (OSError, json.JSONDecodeError, AttributeError):
        return None


def read_risks(root):
    path = root / ".github/quality-context.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("risks", [])
    except (OSError, json.JSONDecodeError, AttributeError):
        return []


COVERAGE_TARGET = 80.0


def compute_verdict(suites, coverage):
    """Semáforo de qualidade para stakeholders: red, yellow, green ou gray."""
    reasons = []
    failed = [s["name"] for s in suites if s["status"] == "failed" or s["failed"]]
    executed = [s for s in suites if s["status"] != "not_run"]
    if failed:
        reasons.append("Há falhas nas verificações: " + ", ".join(failed) + ".")
        return {"level": "red", "label": "Não recomendado para release", "reasons": reasons}
    if not executed:
        return {"level": "gray", "label": "Sem dados suficientes", "reasons": ["Nenhuma verificação foi executada."]}
    not_run = [s["name"] for s in suites if s["status"] == "not_run"]
    missing = [s["name"] for s in suites if s["status"] in ("report_missing", "report_error")]
    if not_run:
        reasons.append("Não executadas neste evento: " + ", ".join(not_run) + ".")
    if missing:
        reasons.append("Sem relatório legível: " + ", ".join(missing) + ".")
    lines = (coverage or {}).get("lines")
    if lines is None:
        reasons.append("Cobertura de código indisponível.")
    elif lines < COVERAGE_TARGET:
        reasons.append(f"Cobertura de linhas ({lines:.1f}%) abaixo da meta de {COVERAGE_TARGET:.0f}%.")
    if reasons:
        return {"level": "yellow", "label": "Aprovado com ressalvas", "reasons": reasons}
    return {"level": "green", "label": "Apto para release", "reasons": ["Todas as verificações passaram e a cobertura atingiu a meta."]}


def collect_metrics(root, outcomes=None):
    outcomes = outcomes or {}
    suites = [parse_suite(root, *suite) for suite in SUITES]
    for suite in suites:
        suite["runner_outcome"] = outcomes.get(suite["id"])
        suite["runner_error"] = suite["runner_outcome"] == "failure" and suite["failed"] == 0
        if suite["runner_outcome"] == "failure":
            suite["status"] = "failed"
        elif suite["runner_outcome"] == "success" and suite["status"] == "not_run":
            suite["status"] = "report_missing"
    totals = {
        key: sum(suite[key] for suite in suites)
        for key in ("passed", "failed", "skipped")
    }
    # Suite que falhou na execução (sem JUnit) conta como 1 falha: nunca pode
    # resultar em 100% de aprovação.
    execution_errors = sum(1 for suite in suites if suite["runner_error"])
    executed = totals["passed"] + totals["failed"] + execution_errors
    coverage = read_coverage(root)
    verdict = compute_verdict(suites, coverage)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "suites": suites,
        "totals": {
            **totals,
            "execution_errors": execution_errors,
            "duration_seconds": round(sum(suite["duration_seconds"] for suite in suites), 3),
            "success_rate": totals["passed"] / executed if executed else None,
        },
        "coverage": coverage,
        "verdict": verdict,
        "risks": read_risks(root),
    }


def _display_rate(value):
    return "N/D" if value is None else f"{value * 100:.1f}%"


def _display_duration(value):
    return f"{value:.2f} s"


def _suite_rows(suites, technical=False):
    rows = []
    for suite in suites:
        if suite["runner_error"]:
            status = "Falha na execução; detalhes JUnit indisponíveis"
        else:
            status_labels = {
                "not_run": "Não executada",
                "report_missing": "JUnit indisponível",
                "report_error": "XML inválido",
                "failed": "Falhou",
                "passed": "Passou",
            }
            status = status_labels[suite["status"]]
        rows.append(
            "<tr>"
            f"<td>{html.escape(suite['name'])}</td>"
            f"<td>{html.escape(status)}</td>"
            f"<td>{suite['passed']}</td><td>{suite['failed']}</td><td>{suite['skipped']}</td>"
            f"<td>{_display_rate(suite['success_rate'])}</td>"
            f"<td>{_display_duration(suite['duration_seconds'])}</td>"
            "</tr>"
        )
        if technical:
            for case in suite["test_cases"]:
                detail = html.escape(case["detail"]).replace("\n", "<br>")
                rows.append(
                    '<tr class="case-row">'
                    f"<td>{html.escape(case['class_name'])} / {html.escape(case['name'])}</td>"
                    f"<td>{html.escape(case['status'].capitalize())}</td>"
                    f"<td colspan=\"3\">{detail}</td>"
                    f"<td colspan=\"2\">{_display_duration(case['duration_seconds'])}</td>"
                    "</tr>"
                )
        if suite["parse_error"]:
            rows.append(
                '<tr class="error-row"><td colspan="7">'
                f"Erro ao ler {html.escape(suite['source'])}: {html.escape(suite['parse_error'])}</td></tr>"
            )
    return "\n".join(rows)


def _coverage_rows(coverage):
    if coverage is None:
        return '<p class="muted">Cobertura indisponível nesta execução.</p>'
    labels = {
        "statements": "Statements",
        "branches": "Branches",
        "functions": "Functions",
        "lines": "Linhas",
    }
    return "<div class=\"coverage-grid\">" + "".join(
        f"<div><span>{label}</span><strong>{_display_rate(coverage.get(key) / 100 if isinstance(coverage.get(key), (int, float)) else None)}</strong></div>"
        for key, label in labels.items()
    ) + "</div>"


def _risk_list(risks):
    if not risks:
        return "<p>Nenhuma informação complementar de risco foi configurada.</p>"
    return "<ul>" + "".join(
        f"<li><strong>{html.escape(risk.get('title', 'Risco'))}.</strong> {html.escape(risk.get('detail', ''))}</li>"
        for risk in risks
    ) + "</ul>"


VERDICT_COLORS = {"green": "#1d7a46", "yellow": "#b7791f", "red": "#b3261e", "gray": "#586674"}


def _business_status(suite):
    if suite["runner_error"] or suite["status"] == "failed":
        return "Com falhas"
    return {
        "passed": "Aprovada",
        "not_run": "Não verificada neste evento",
        "report_missing": "Sem resultado",
        "report_error": "Sem resultado",
    }[suite["status"]]


COVERAGE_SCOPE = "somente o código instrumentado do demand-service; não representa a cobertura de todo o produto"

RATE_SCOPE_NOTE = (
    "A taxa considera apenas os testes efetivamente executados: entram aprovados, reprovados e falhas de "
    "execução de suites; ficam fora os testes ignorados e as suites não executadas. Cenários configurados "
    "como falha esperada (test.fail) podem ser reportados pelo Playwright/JUnit de forma que não representa "
    "uma validação funcional normal, e isso deve ser considerado na leitura da taxa e da cobertura."
)

INCOMPLETE_VALIDATION_ALERT = (
    "Existem cenários ignorados ou não executados. Portanto, a taxa de sucesso dos testes executados "
    "não representa validação integral dos cenários planejados."
)


def _incomplete_validation(metrics):
    """Mensagem de validação incompleta, derivada só dos resultados desta execução."""
    ignored = metrics["totals"]["skipped"]
    missing = [s["name"] for s in metrics["suites"] if s["status"] in ("not_run", "report_missing", "report_error")]
    if not ignored and not missing:
        return ""
    evidence = []
    if ignored:
        evidence.append(f"{ignored} teste(s) ignorado(s)")
    if missing:
        evidence.append("suites sem resultado nesta execução: " + ", ".join(missing))
    return (
        f'<div class="alert"><strong>Atenção.</strong> {html.escape(INCOMPLETE_VALIDATION_ALERT)} '
        f'<span class="muted">({html.escape("; ".join(evidence))}.)</span></div>'
    )


def _summary_section(metrics):
    """Resumo da execução: veredito, taxa e contagens, sempre no topo do relatório."""
    verdict = metrics["verdict"]
    totals = metrics["totals"]
    color = VERDICT_COLORS[verdict["level"]]
    reasons = "".join(f"<li>{html.escape(r)}</li>" for r in verdict["reasons"])
    errors = totals.get("execution_errors", 0)
    return (
        "<section><h2>Resumo da execução</h2>"
        f'<div class="verdict" style="border-left:8px solid {color}">'
        f'<span class="muted">Situação geral da qualidade</span><h2 style="color:{color};margin:4px 0">'
        f'{html.escape(verdict["label"])}</h2><ul>{reasons}</ul></div>'
        '<div class="metrics" style="margin-top:12px">'
        f'<div class="metric"><span>Taxa de sucesso (apenas testes executados)</span><strong>{_display_rate(totals["success_rate"])}</strong></div>'
        f'<div class="metric"><span>Passed</span><strong>{totals["passed"]}</strong></div>'
        f'<div class="metric"><span>Failed</span><strong>{totals["failed"]}</strong></div>'
        f'<div class="metric"><span>Falhas de execução</span><strong>{errors}</strong></div>'
        f'<div class="metric"><span>Ignorados (não executados)</span><strong>{totals["skipped"]}</strong></div>'
        f'<div class="metric"><span>Duração somada</span><strong>{_display_duration(totals["duration_seconds"])}</strong></div>'
        "</div>"
        f'<p class="muted rate-scope">{html.escape(RATE_SCOPE_NOTE)}</p>'
        f"{_incomplete_validation(metrics)}</section>"
    )


def _business_sections(metrics):
    layers = "".join(
        f"<tr><td>{html.escape(s['name'])}</td><td>{html.escape(_business_status(s))}</td>"
        f"<td>{s['passed'] + s['failed']}</td><td>{_display_rate(s['success_rate'])}</td></tr>"
        for s in metrics["suites"]
    )
    return (
        f"<section><h2>Áreas verificadas</h2><table><thead><tr><th>Área</th><th>Situação</th>"
        f"<th>Testes executados</th><th>Taxa (executados)</th></tr></thead><tbody>{layers}</tbody></table></section>"
    )


def render_report(metrics, technical):
    title = "Relatório Técnico de Qualidade" if technical else "Relatório de Qualidade do Produto"
    table_headers = """
      <thead><tr><th>Suite / Caso</th><th>Resultado</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Taxa (executados)</th><th>Duração</th></tr></thead>
    """
    details = _suite_rows(metrics["suites"], technical=True)
    coverage = _coverage_rows(metrics["coverage"])
    complementary = "" if technical else f"<section><h2>Riscos e lacunas complementares</h2>{_risk_list(metrics['risks'])}</section>"
    notes = """
      <p class="muted">A taxa de sucesso é passed / (passed + failed + falhas de execução); skipped não entra no denominador. A cobertura representa somente os arquivos instrumentados na configuração unitária do demand-service.</p>
    """
    if not technical:
        notes += '<p class="muted">Suites não executadas neste evento não são consideradas aprovadas. Falhas de infraestrutura podem reprovar o job mesmo sem falhas de teste nos resultados coletados.</p>'
    if technical:
        body = (
            _summary_section(metrics)
            + f"<section><h2>Cobertura instrumentada ({COVERAGE_SCOPE})</h2>{coverage}</section>"
            f"<section><h2>Resultados por suite</h2><table>{table_headers}<tbody>{details}</tbody></table></section>{notes}"
        )
    else:
        body = (
            _summary_section(metrics)
            + _business_sections(metrics)
            + f"<section><h2>Cobertura de código ({COVERAGE_SCOPE})</h2>{coverage}</section>{complementary}{notes}"
        )
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title><style>
:root{{--ink:#17212b;--muted:#586674;--line:#d7e0e5;--paper:#f4f7f8;--accent:#126b66;--warn:#a1472d}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 system-ui,sans-serif}}
main{{max-width:1180px;margin:32px auto;padding:0 22px}}header{{border-top:5px solid var(--accent);padding:22px 0 18px}}
h1{{font-size:28px;margin:0 0 4px}}h2{{font-size:19px;margin:28px 0 12px}}.muted{{color:var(--muted)}}
.metrics,.coverage-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}}
.metric,.coverage-grid div{{background:white;border:1px solid var(--line);padding:14px}}
.metric span,.coverage-grid span{{display:block;color:var(--muted);font-size:13px}}.metric strong,.coverage-grid strong{{font-size:23px}}
table{{width:100%;border-collapse:collapse;background:white;font-size:13px}}th,td{{padding:9px 10px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}}
th{{background:#e8eff0;color:#253942}}.case-row td{{color:var(--muted)}}.error-row td{{color:var(--warn)}}.verdict{{background:white;border:1px solid var(--line);padding:16px 20px}}.alert{{background:#fff7e6;border:1px solid #e0b252;border-left:6px solid #b7791f;padding:12px 16px;margin-top:12px}}section{{margin-top:24px}}
@media(max-width:700px){{main{{padding:0 12px}}table{{display:block;overflow-x:auto;white-space:nowrap}}h1{{font-size:23px}}}}
</style></head><body><main><header><h1>{title}</h1>
<div class="muted">Gerado em {html.escape(metrics['generated_at'])}</div></header>
{body}
</main></body></html>"""


def generate(root):
    root = Path(root)
    output = root / "quality-reports"
    output.mkdir(parents=True, exist_ok=True)
    outcomes = {
        "mobile": os.environ.get("MOBILE_UNIT_OUTCOME"),
        "demand_unit": os.environ.get("DEMAND_UNIT_OUTCOME"),
        "auth_api": os.environ.get("AUTH_API_OUTCOME"),
        "demand_api": os.environ.get("DEMAND_API_OUTCOME"),
        "e2e_smoke": os.environ.get("E2E_SMOKE_OUTCOME"),
        "e2e_full": os.environ.get("E2E_FULL_OUTCOME"),
    }
    metrics = collect_metrics(root, outcomes)
    (output / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / "technical-report.html").write_text(render_report(metrics, True), encoding="utf-8")
    (output / "business-report.html").write_text(render_report(metrics, False), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    generate(Path(__file__).resolve().parents[2])