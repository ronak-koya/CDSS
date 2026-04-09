import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface PatientContext {
  age: number;
  gender: string;
  medications: string[];
  allergies: string[];
  latestVitals: Record<string, unknown> | null;
  recentLabs: Array<{ name: string; value: string; unit: string; flag: string }>;
  diagnoses: string[];
  riskScores: Array<{ type: string; level: string; score: number }>;
}

export interface SymptomInput {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}

export interface DiagnosisResult {
  name: string;
  icdCode: string;
  confidence: number;
  severity: string;
  reasoning: string;
  supportingEvidence: string[];
  recommendedTests: string[];
  urgency: 'routine' | 'urgent' | 'emergency';
}

export interface AnalysisResponse {
  diagnoses: DiagnosisResult[];
  clinicalNotes: string;
  redFlags: string[];
}

export async function analyzeSymptoms(
  context: PatientContext,
  symptoms: SymptomInput[]
): Promise<AnalysisResponse> {
  const symptomText = symptoms
    .map((s) => `- ${s.name} (severity: ${s.severity}, duration: ${s.duration})`)
    .join('\n');

  const medicationText = context.medications.length
    ? context.medications.join(', ')
    : 'None documented';
  const allergyText = context.allergies.length ? context.allergies.join(', ') : 'NKDA';
  const vitalsText = context.latestVitals
    ? Object.entries(context.latestVitals)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : 'Not available';
  const labText = context.recentLabs.length
    ? context.recentLabs.map((l) => `${l.name}: ${l.value} ${l.unit} (${l.flag})`).join(', ')
    : 'No recent labs';

  const prompt = `You are a board-certified clinical decision support AI assisting a physician. Analyze the patient information and symptoms to generate a differential diagnosis.

PATIENT INFORMATION:
- Age: ${context.age} years old
- Gender: ${context.gender}
- Active Medications: ${medicationText}
- Known Allergies: ${allergyText}
- Latest Vitals: ${vitalsText}
- Recent Labs: ${labText}
- Active Diagnoses: ${context.diagnoses.join(', ') || 'None'}

PRESENTING SYMPTOMS:
${symptomText}

TASK: Generate a ranked differential diagnosis list with 3-5 conditions. Consider the patient's complete medical context, including how their medications, allergies, and existing conditions may influence the presentation.

Respond ONLY with valid JSON in this exact format:
{
  "diagnoses": [
    {
      "name": "Full diagnosis name",
      "icdCode": "ICD-10 code",
      "confidence": 0.85,
      "severity": "mild|moderate|severe|critical",
      "reasoning": "Clinical reasoning explaining why this diagnosis fits the presentation (2-3 sentences)",
      "supportingEvidence": ["evidence point 1", "evidence point 2", "evidence point 3"],
      "recommendedTests": ["test 1", "test 2"],
      "urgency": "routine|urgent|emergency"
    }
  ],
  "clinicalNotes": "Important overall clinical observations, patterns, or concerns",
  "redFlags": ["red flag 1", "red flag 2"]
}`;

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = completion.choices[0]?.message?.content ?? '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  return JSON.parse(jsonMatch[0]) as AnalysisResponse;
}
