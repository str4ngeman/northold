import { FieldShell } from "@/components/field/field-shell";

export default function UniverseLayout({ children }: LayoutProps<"/universe">) {
  return <FieldShell>{children}</FieldShell>;
}
