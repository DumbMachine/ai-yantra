export interface NodeRecord {
	id: string;
	path: string;
	name: string;
	treePath: string;
	parentId: string | null;
	isDirectory: boolean;
	size: number;
	mimeType: string | null;
	contentHash: string | null;
	createdAt: Date;
	modifiedAt: Date;
	accessedAt: Date;
	mode: string;
	owner: string;
	metadata: Record<string, unknown> | null;
}

export interface NewNodeRecord {
	id: string;
	path: string;
	name: string;
	treePath: string;
	parentId?: string | null;
	isDirectory?: boolean;
	size?: number;
	mimeType?: string | null;
	contentHash?: string | null;
	mode?: string;
	owner?: string;
	metadata?: Record<string, unknown>;
}

export interface ContentBlockRecord {
	hash: string;
	data: string;
	size: number;
	refCount: number;
	createdAt: Date;
	lastAccessedAt: Date;
}

export interface SearchIndexRecord {
	nodeId: string;
	searchVector: string | null;
	textContent: string | null;
	updatedAt: Date;
}
