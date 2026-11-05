import { ProposalEditor } from "@/components/proposal-editor/editor";
import { requireUser } from "@/lib/auth/session";
import { addDays, todayInKolkata } from "@/lib/proposals/dates";
import { getBusinessProfile } from "@/lib/proposals/service";

export default async function NewProposalPage() {
  const user = await requireUser();
  const profile = await getBusinessProfile(user.id);

  return (
    <ProposalEditor
      proposal={null}
      events={[]}
      defaults={{
        currency: profile.defaultCurrency,
        taxPercent: profile.defaultTaxPercent,
        terms: profile.defaultPaymentTerms ?? "",
        validUntil: addDays(todayInKolkata(), profile.defaultValidityDays),
      }}
    />
  );
}
