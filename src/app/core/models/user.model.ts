export type UserRole = 'master' | 'admin' | 'manager' | 'user';
export type UserStatus = 'pending' | 'active' | 'inactive';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tabs?: string[] | null;
    status: UserStatus;
    isActive: boolean;
    avatarUrl?: string | null;
    invitedBy?: User | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthResponse {
    access_token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface TabNode {
    key: string;
    label: string;
    children?: TabNode[];
}

export const TAB_TREE: TabNode[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'reports', label: 'Relatórios' },
    { key: 'jobs', label: 'Jobs' },
    {
        key: 'gosac-pontta',
        label: 'Gosac / Pontta',
        children: [
            { key: 'gosac-pontta/grupos', label: 'Grupos' },
            { key: 'gosac-pontta/rodizio', label: 'Rodízio GOSAC' },
            { key: 'gosac-pontta/rodizio-pontta', label: 'Rodízio Pontta' },
            { key: 'gosac-pontta/pagamento-montador', label: 'Pagamento Montador' },
            { key: 'gosac-pontta/pcp-operacional', label: 'PCP Operacional' },
        ],
    },
    { key: 'usuarios', label: 'Usuários' },
    { key: 'configuracoes', label: 'Configurações' },
];

export function flattenTabKeys(nodes: TabNode[] = TAB_TREE): string[] {
    const keys: string[] = [];
    for (const node of nodes) {
        keys.push(node.key);
        if (node.children?.length) {
            keys.push(...flattenTabKeys(node.children));
        }
    }
    return keys;
}

export const ALL_TAB_KEYS = flattenTabKeys();
