export interface ChannelAdapterDescriptor {
  id: string;
  status: "planned" | "active";
}

export const plannedChannelAdapters: ChannelAdapterDescriptor[] = [
  { id: "telegram", status: "planned" },
  { id: "whatsapp", status: "planned" },
  { id: "web-widget", status: "planned" }
];

