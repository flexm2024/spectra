import type { PortfolioForm } from './types'

const PROMPT = `다음 프로젝트 정보를 분석해서 포트폴리오 등록 양식에 맞게 JSON으로 작성해줘.

프로젝트 정보:
{INPUT}

아래 JSON 형식으로만 응답해. 마크다운 코드블록 없이 JSON만:
{
  "category": "웹사이트 | 모바일앱 | 데스크탑앱 | API/백엔드 | 기타 중 하나",
  "title": "프로젝트 이름",
  "shortDesc": "한두 문장으로 프로젝트를 설명 (카드에 표시됨)",
  "detailDesc": "프로젝트 배경, 목적, 주요 내용을 3~5문장으로 상세히 설명 (모달에 표시됨)",
  "period": "개발 기간 (예: 3개월, 2주)",
  "team": "팀 구성 (예: 개인 프로젝트, 3인 팀)",
  "myRole": "내 역할 (예: 기획·개발, 프론트엔드 개발)",
  "techStack": "기술 스택을 쉼표로 구분 (예: React, TypeScript, Node.js)",
  "features": "주요 기능을 줄바꿈으로 구분, 한 줄에 하나씩",
  "siteUrl": "사이트 URL이 있으면 입력, 없으면 빈 문자열",
  "githubUrl": "GitHub URL이 있으면 입력, 없으면 빈 문자열"
}`

export async function listAvailableModels(apiKey: string): Promise<string[]> {
  const names: string[] = []
  for (const version of ['v1', 'v1beta']) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`
      )
      if (!res.ok) continue
      const data = await res.json()
      const models: string[] = (data.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes('generateContent')
        )
        .map((m: { name: string }) => m.name.replace('models/', ''))
      names.push(...models)
      break
    } catch {
      continue
    }
  }
  return [...new Set(names)]
}

async function callModel(model: string, prompt: string, apiKey: string): Promise<string> {
  const errors: string[] = []
  for (const version of ['v1', 'v1beta']) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      if (res.ok) return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const errMsg = data?.error?.message ?? `HTTP ${res.status}`
      errors.push(errMsg)
      if (res.status === 400 || res.status === 403) break
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  throw new Error(errors[0] ?? '호출 실패')
}

export async function generateWithGemini(input: string, apiKey: string): Promise<PortfolioForm> {
  const models = await listAvailableModels(apiKey)
  if (models.length === 0) throw new Error('사용 가능한 모델을 찾을 수 없습니다. API 키를 확인해주세요.')

  const prompt = PROMPT.replace('{INPUT}', input)
  let lastError = ''

  for (const model of models) {
    try {
      const text = await callModel(model, prompt, apiKey)
      if (!text) continue
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue
      return JSON.parse(jsonMatch[0]) as PortfolioForm
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }

  throw new Error(lastError || '모든 모델 호출에 실패했습니다.')
}

export function parseErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('API key expired') || msg.includes('API_KEY_INVALID')) return 'API 키가 만료되었거나 유효하지 않습니다.'
  if (msg.includes('quota') || msg.includes('429')) return '사용량 한도 초과입니다. 잠시 후 다시 시도해주세요.'
  if (msg.includes('사용 가능한 모델')) return msg
  return msg.split('\n')[0]
}
