declare module "wink-bm25-text-search" {
  interface BM25Config {
    fldWeights?: Record<string, number>;
  }

  interface BM25Doc {
    [key: string]: any;
  }

  interface BM25Result {
    id: string;
    score: number;
  }

  function winkBM25(): {
    defineConfig(config: BM25Config): void;
    addDoc(doc: BM25Doc): void;
    consolidate(): void;
    search(query: string, limit?: number): BM25Result[];
  };

  export = winkBM25;
}