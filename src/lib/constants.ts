export const CLIENT_FIELDS = ['id', 'projectId', 'name', 'fatherHusband', 'birthDate', 'phone', 'email', 'nid', 'plot', 'totalAmount', 'shareCount', 'password', 'photo', 'remarks', 'planAssignments', '_row'];
export const PROJECT_FIELDS = ['id', 'name', 'description'];
export const PLAN_FIELDS = ['id', 'projectId', 'name'];
export const INST_DEF_FIELDS = ['id', 'projectId', 'planId', 'title', 'dueDate', 'targetAmount'];
export const PAYMENT_FIELDS = ['id', 'projectId', 'clientId', 'instDefId', 'amount', 'date', 'status', 'note', 'method', 'trxId', 'approvedBy'];
export const EXPENSE_FIELDS = ['id', 'projectId', 'category', 'amount', 'date', 'description'];
export const ADMIN_FIELDS = ['id', 'name', 'username', 'password', 'role', 'isTemp'];
