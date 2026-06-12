/** Top-level navigation views shared by editor and client experiences. */
export type View =
  | { kind: 'overview' }
  | { kind: 'structure' }
  | { kind: 'adgroup'; id: string; tab?: string }
  | { kind: 'feedback' } // editor only
  | { kind: 'summary' } // client review summary
  | { kind: 'validation' } // editor validation summary
  | { kind: 'final' };

export const OVERVIEW: View = { kind: 'overview' };
