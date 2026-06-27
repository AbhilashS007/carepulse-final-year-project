"""
CarePulse Backend — gemini_service.py
--------------------------------------
Phase 3: Gemini Clinical Intelligence Service.

Provides the interface to Google's Gemini API for generating
professional clinical narrative reports.  This service is a
**narrative-generation layer only** — it never computes risk scores,
trends, confidence, or any quantitative metric.  All numbers are
sourced from the Level 3 Rule Engine and passed in as context.

Engine identifier: "gemini"
"""

from __future__ import annotations

import json
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load .env before anything else
load_dotenv()

logger = logging.getLogger("carepulse.gemini")


# ================================================================
# RESPONSE MODEL
# ================================================================

class GeminiReportResponse(BaseModel):
    """Structured response from the Gemini clinical narrative generator."""
    clinical_summary:          str = Field("", description="Professional clinical summary")
    caregiver_recommendation:  str = Field("", description="Actionable caregiver recommendations")
    nursing_notes:             str = Field("", description="SOAP-format nursing documentation")
    monitoring_plan:           str = Field("", description="Monitoring parameters and frequency")
    priority_actions:          str = Field("", description="Priority actions for the next 24 hours")
    patient_explanation:       str = Field("", description="Patient-friendly explanation")


# ================================================================
# SYSTEM INSTRUCTION
# ================================================================

SYSTEM_INSTRUCTION = """\
You are the CarePulse AI Clinical Assistant — a professional clinical \
narrative generator embedded in the CarePulse Smart Diaper Monitoring System.

YOUR ROLE:
You generate clear, professional clinical documentation from structured \
patient data that has ALREADY been analyzed by the CarePulse Rule Engine.

CRITICAL CONSTRAINTS — READ CAREFULLY:
1. The following values are FINAL and AUTHORITATIVE — they have been \
   computed by the CarePulse Level 3 Disease-Aware Rule Engine.  You must \
   NEVER recalculate, modify, contradict, or invent any of them:
   • Risk Score (0–100)
   • Risk Level (low / moderate / high / critical)
   • Trend Direction (up / down / stable) and Trend Percent
   • Confidence Score (0–100)
   • Telemetry values (wetness averages, event counts, battery levels)
   • Alert statistics (active count, critical count, 7-day totals)
   • Disease information, severity, and diagnosis duration

2. You must NEVER invent numerical data, lab results, vital signs, \
   medication names, dosages, or any clinical measurement not explicitly \
   provided in the context below.

3. You must NEVER provide a medical diagnosis or override existing \
   clinical assessments.

YOUR RESPONSIBILITIES — generate these six sections:
1. clinical_summary — A professional 3–5 sentence clinical narrative \
   that synthesizes all provided data points.
2. caregiver_recommendation — 3–5 specific, actionable steps for the \
   assigned caregiver, prioritized by urgency.
3. nursing_notes — A concise SOAP-format documentation entry \
   (Subjective, Objective, Assessment, Plan).
4. monitoring_plan — Specific monitoring frequency, parameters to track, \
   and escalation criteria.
5. priority_actions — 3–5 short, numbered priority actions for the \
   next 24 hours that the caregiver should complete.
6. patient_explanation — A plain-language summary suitable for the \
   patient or family members (6th-grade reading level, empathetic tone).

OUTPUT FORMAT:
Respond with a JSON object containing exactly these six string keys:
  clinical_summary, caregiver_recommendation, nursing_notes,
  monitoring_plan, priority_actions, patient_explanation

Do NOT include markdown formatting, code fences, or any text outside \
the JSON object.\
"""


# ================================================================
# PROMPT BUILDER
# ================================================================

def _build_prompt(
    patient: Dict[str, Any],
    insight: Dict[str, Any],
    telemetry: Dict[str, Any],
    alerts: Dict[str, Any],
    diagnosis_days: Optional[int],
) -> str:
    """
    Build the user-facing prompt that provides all rule-engine data
    as structured context for Gemini to narrate.
    """

    # Format diagnosis duration
    if diagnosis_days is not None:
        if diagnosis_days <= 30:
            duration_str = f"{diagnosis_days} days (recently diagnosed)"
        elif diagnosis_days <= 365:
            months = diagnosis_days // 30
            duration_str = f"{diagnosis_days} days (~{months} months)"
        else:
            years = diagnosis_days // 365
            months = (diagnosis_days % 365) // 30
            duration_str = f"{diagnosis_days} days (~{years} years, {months} months)"
    else:
        duration_str = "Not recorded"

    # Alert severity breakdown
    sev_dist = alerts.get("severity_distribution", {})
    alert_breakdown = (
        f"Critical: {sev_dist.get('critical', 0)}, "
        f"Warning: {sev_dist.get('warning', 0)}, "
        f"Info: {sev_dist.get('info', 0)}"
    )

    prompt = f"""\
=== PATIENT DATA (from CarePulse Rule Engine) ===

PATIENT PROFILE:
  Name:              {patient.get('name', 'Unknown')}
  Age:               {patient.get('age', 'N/A')}
  Ward:              {patient.get('ward', 'N/A')}
  Room:              {patient.get('room', 'N/A')}
  Condition:         {patient.get('condition', 'N/A')}
  Assigned Nurse:    {patient.get('caregiver_name', 'N/A')}

DISEASE PROFILE:
  Disease:           {patient.get('disease', 'Not specified')}
  Severity:          {patient.get('disease_severity', 'Not specified')}
  Diagnosis Duration:{duration_str}

RULE ENGINE RISK ASSESSMENT (AUTHORITATIVE — DO NOT MODIFY):
  Risk Score:        {insight.get('risk_score', 'N/A')}/100
  Risk Level:        {insight.get('risk_level', 'N/A')}
  Trend Direction:   {insight.get('trend_direction', 'N/A')}
  Trend Percent:     {insight.get('trend_percent', 0)}%
  Confidence:        {insight.get('confidence', 'N/A')}%
  Generated By:      CarePulse Rule Engine (Level 3)

TELEMETRY SUMMARY (7-day window):
  Total Events:      {telemetry.get('event_count_7d', 0)}
  Avg Wetness:       {telemetry.get('avg_wetness', 0)}%
  Peak Wetness:      {telemetry.get('max_wetness', 0)}%
  Avg Daily Freq:    {telemetry.get('avg_daily_frequency', 0)} events/day
  Latest Battery:    {telemetry.get('latest_battery', 'N/A')}%
  Last Event Age:    {telemetry.get('latest_event_age_h', 'N/A')} hours ago

ALERT SUMMARY (7-day window):
  Active Alerts:     {alerts.get('active_count', 0)}
  Critical Active:   {alerts.get('critical_active', 0)}
  Total (7 days):    {alerts.get('total_7d', 0)}
  Breakdown:         {alert_breakdown}

RULE ENGINE INSIGHT:
  Clinical Note:     {insight.get('insight_text', 'N/A')}
  Risk Explanation:  {insight.get('risk_explanation', 'N/A')}
  Recommendation:    {insight.get('recommendation', 'N/A')}
  Monitoring Advice: {insight.get('monitoring_advice', 'N/A')}

=== END OF PATIENT DATA ===

Using ONLY the data above, generate the six clinical narrative sections \
as specified in your system instructions.  Reference the exact numbers \
from the Rule Engine — do not invent or modify any values.\
"""
    return prompt


# ================================================================
# MAIN ENTRY POINT
# ================================================================

async def generate_clinical_report(
    patient: Dict[str, Any],
    insight: Dict[str, Any],
    telemetry: Dict[str, Any],
    alerts: Dict[str, Any],
    diagnosis_days: Optional[int],
) -> GeminiReportResponse:
    """
    Generate a clinical narrative report using Google Gemini.

    Parameters
    ----------
    patient       : Patient record as dict (name, age, ward, disease, etc.)
    insight       : Latest AIInsight record as dict (risk_score, risk_level, etc.)
    telemetry     : Output of disease_ai.analyze_telemetry()
    alerts        : Output of disease_ai.analyze_alerts()
    diagnosis_days: Output of disease_ai.compute_diagnosis_duration()

    Returns
    -------
    GeminiReportResponse with all six narrative sections populated.

    Raises
    ------
    ValueError  — if GEMINI_API_KEY is not configured
    RuntimeError — if the Gemini API call fails after retry
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your-api-key-here":
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Please set it in backend/.env to use Gemini Clinical Intelligence."
        )

    # Import google.genai lazily to avoid import errors if SDK not installed
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise RuntimeError(
            "google-genai package is not installed. "
            "Run: pip install google-genai==1.14.0"
        )

    # Build the prompt
    prompt = _build_prompt(patient, insight, telemetry, alerts, diagnosis_days)

    # Configure the Gemini client
    client = genai.Client(api_key=api_key)

    # Call Gemini with retry logic
    max_retries = 2
    last_error = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.3,
                    max_output_tokens=8192,
                    response_mime_type="application/json",
                ),
            )

            # Parse the response
            raw_text = response.text
            if not raw_text:
                raise RuntimeError("Gemini returned an empty response.")

            return _parse_response(raw_text)

        except Exception as e:
            last_error = e
            logger.warning(
                f"Gemini API call attempt {attempt + 1}/{max_retries} failed: {e}"
            )
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep(1)  # Brief pause before retry
                continue

    # All retries exhausted
    logger.error(f"Gemini API call failed after {max_retries} attempts: {last_error}")
    raise RuntimeError(
        f"Gemini API call failed after {max_retries} attempts. "
        f"Last error: {str(last_error)}"
    )


# ================================================================
# RESPONSE PARSER
# ================================================================

def _parse_response(raw_text: str) -> GeminiReportResponse:
    """
    Parse the Gemini JSON response into a GeminiReportResponse.
    Handles malformed JSON gracefully by filling missing fields.
    """
    fallback = "Report section unavailable — please regenerate."

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse Gemini JSON response: {raw_text[:200]}...")
        # Fallback: Extract keys using regex to salvage truncated JSON responses
        import re
        data = {}
        keys = [
            "clinical_summary",
            "caregiver_recommendation",
            "nursing_notes",
            "monitoring_plan",
            "priority_actions",
            "patient_explanation"
        ]
        for key in keys:
            # Match "key": "value" allowing for escaped characters
            match = re.search(rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)', raw_text)
            if match:
                # Unescape newlines and quotes
                val = match.group(1).replace('\\n', '\n').replace('\\"', '"')
                data[key] = val
        
        # If we failed to extract even a single field, return the hardcoded fallbacks
        if not data:
            return GeminiReportResponse(
                clinical_summary=fallback,
                caregiver_recommendation=fallback,
                nursing_notes=fallback,
                monitoring_plan=fallback,
                priority_actions=fallback,
                patient_explanation=fallback,
            )

    return GeminiReportResponse(
        clinical_summary=data.get("clinical_summary", fallback),
        caregiver_recommendation=data.get("caregiver_recommendation", fallback),
        nursing_notes=data.get("nursing_notes", fallback),
        monitoring_plan=data.get("monitoring_plan", fallback),
        priority_actions=data.get("priority_actions", fallback),
        patient_explanation=data.get("patient_explanation", fallback),
    )
