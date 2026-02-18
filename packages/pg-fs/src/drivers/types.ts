import type { NodeRecord, NewNodeRecord } from "../schema/types.js";

export interface DatabaseDriver {
	initialize(): Promise<void>;

	findNodeByPath(path: string): Promise<NodeRecord | undefined>;
	insertNode(node: NewNodeRecord): Promise<void>;
	updateNode(id: string, data: Partial<NodeRecord>): Promise<void>;
	deleteNode(id: string): Promise<void>;
	findChildNodes(parentId: string): Promise<NodeRecord[]>;
	findDescendantsByPathPrefix(pathPrefix: string): Promise<NodeRecord[]>;
	findNodesByGlob(
		basePath: string,
		namePattern: string,
		limit: number,
	): Promise<NodeRecord[]>;

	getContent(hash: string): Promise<string>;
	getOrCreateContent(content: string): Promise<string>;
	incrementRefCount(hash: string): Promise<void>;
	decrementRefCount(hash: string): Promise<void>;
	garbageCollect(): Promise<number>;

	updateSearchIndex(
		nodeId: string,
		path: string,
		content?: string,
	): Promise<void>;
	searchContent(
		query: string,
		basePath: string,
		limit: number,
	): Promise<Array<{ nodeId: string; path: string }>>;
}
