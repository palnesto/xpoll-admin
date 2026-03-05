import {
  Target,
  Link2,
  MapPin,
  Briefcase,
  Zap,
  Heart,
  Share2,
  FileText,
} from "lucide-react";
import { SectionCard, InfoRow } from "@/components/campaign/campaign-detail-hero";
import type { CampaignDetail } from "@/components/campaign/types";

export type CampaignDetailSectionsProps = {
  campaign: CampaignDetail;
};

export function CampaignDetailSections({ campaign }: CampaignDetailSectionsProps) {
  const links = [
    { label: "Website", href: campaign.websiteLink },
    { label: "Twitter", href: campaign.twitterLink },
    { label: "Instagram", href: campaign.instagramLink },
    { label: "Telegram", href: campaign.telegramLink },
    { label: "Video", href: campaign.videoLink },
    {
      label: "Email",
      href: campaign.emailLink ? `mailto:${campaign.emailLink}` : null,
    },
  ].filter((l) => l.href);

  const geo = campaign.targetGeo;
  const hasGeo =
    geo &&
    (geo.cities?.length || geo.states?.length || geo.countries?.length);
  const industries = campaign.linkedIndustries?.industries ?? [];
  const plan = campaign.currentPlan;
  const share = campaign.shareFeatureField;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <SectionCard title="Overview" icon={FileText}>
        <div className="space-y-0">
          <InfoRow
            label="Campaign ID"
            value={<code className="text-xs break-all">{campaign._id}</code>}
            icon={Target}
          />
          <InfoRow label="Status" value={campaign.status} icon={Zap} />
          <InfoRow
            label="Donation supported"
            value={campaign.isDonationSupported ? "Yes" : "No"}
            icon={Heart}
          />
          <InfoRow
            label="Petition enabled"
            value={campaign.isPetitionEnabled ? "Yes" : "No"}
            icon={FileText}
          />
        </div>
      </SectionCard>

      <SectionCard title="Goal & description" icon={Target}>
        <div className="space-y-3">
          {campaign.goal ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {campaign.goal}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No goal set.</p>
          )}
          {campaign.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2 border-t border-border/50">
              {campaign.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No description.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Links" icon={Link2}>
        {links.length ? (
          <ul className="space-y-2">
            {links.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {label}: {href}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No links added.</p>
        )}
      </SectionCard>

      <SectionCard title="Target geography" icon={MapPin}>
        {hasGeo ? (
          <div className="space-y-2 text-sm">
            {geo!.countries?.length ? (
              <p>
                <span className="text-muted-foreground">Countries:</span>{" "}
                {geo!.countries.join(", ")}
              </p>
            ) : null}
            {geo!.states?.length ? (
              <p>
                <span className="text-muted-foreground">States:</span>{" "}
                {geo!.states.join(", ")}
              </p>
            ) : null}
            {geo!.cities?.length ? (
              <p>
                <span className="text-muted-foreground">Cities:</span>{" "}
                {geo!.cities.join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No target geography set.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Industries" icon={Briefcase}>
        {industries.length ? (
          <div className="flex flex-wrap gap-2">
            {industries.map((ind) => (
              <span
                key={ind._id}
                className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/30"
              >
                {ind.name ?? ind._id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No industries linked.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Current plan" icon={Zap}>
        {plan ? (
          <div className="space-y-2 text-sm">
            <InfoRow label="Active" value={plan.active ? "Yes" : "No"} />
            <InfoRow label="Reason" value={plan.reason ?? "—"} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No plan data.</p>
        )}
      </SectionCard>

      <SectionCard title="Share & referral" icon={Share2}>
        {share ? (
          <div className="space-y-2 text-sm">
            <InfoRow
              label="Share enabled"
              value={share.isEnabled ? "Yes" : "No"}
            />
            <InfoRow
              label="Referral levels"
              value={String(share.referral_levels?.length ?? 0)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No share data.</p>
        )}
      </SectionCard>

      {campaign.rewardSums?.activeTrials && (
        <SectionCard title="Reward summary (active trials)" icon={Heart}>
          <p className="text-sm text-muted-foreground">
            Reward data is available; display can be extended with asset
            breakdown.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
