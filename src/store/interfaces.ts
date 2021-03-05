export interface ContactField {
  key: string;
  label: string;
  value_type: string;
}

export interface ContactGroup {
  uuid: string;
  count: number;
  name: string;
  query?: string;
  status: string;
}
