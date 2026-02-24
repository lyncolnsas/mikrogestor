import { getPublicLandingDataAction } from "@/modules/saas/actions/landing.actions";
import { notFound } from "next/navigation";
import { LandingPageContent } from "./landing-page-content";

export default async function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await getPublicLandingDataAction(slug);

    if (!data) {
        notFound();
    }

    return <LandingPageContent data={data} />;
}
