import { Heading } from "@/components/ui/elements/Heading";
import { useTranslations } from "next-intl";

export function DevicesTable() {
  const t = useTranslations('dashboard.devices')
  return <div className='lg:px-10'>
    <Heading 
        title={t('header.heading')}
        description={t('header.description')}
        size='lg'
    />
  </div>
}