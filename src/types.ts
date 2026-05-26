export interface SummarizeResponse {
  success: boolean;
  result?: string;
  message?: string;
  modelUsed?: string;
}

export interface SampleTranscript {
  id: string;
  title: string;
  description: string;
  transcript: string;
  focusNotes?: string;
}
