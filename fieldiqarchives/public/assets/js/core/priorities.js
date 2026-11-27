export const PRIORITIES={A:'A · Crítica',B:'B · Média',C:'C · Leve'};
export const PRIORITY_ORDER={A:0,B:1,C:2};
export const priorityCode=value=>({critica:'A',alta:'A',media:'B',baixa:'C'})[value]??value;
