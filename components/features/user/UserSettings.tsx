'use client'

import { useTranslations } from 'next-intl'

import { ChangeEmailForm } from './account/ChangeEmailForm'
import { ChangePasswordForm } from './account/ChangePasswordForm'
import { ChangeColorForm } from './appearance/ChangeColorForm'
import { ChangeLanguageForm } from './appearance/ChangeLanguageForm'
import { ChangeThemeForm } from './appearance/ChangeTheme'
import { ChangeNotificationsForm } from './notifications/ChangeNotificationsForm'
import { ChangeSmtpSettingsForm } from './notifications/ChangeSmtpSettingsForm'
import { ChangeTelegramSettingsForm } from './notifications/ChangeTelegramSettingsForm'
import { ChangeAvatarForm } from './profile/ChangeAvatarForm'
import { ChangeInfoForm } from './profile/ChangeInfoForm'
import { SessionsList } from './sessions/SessionsList'

import { Heading } from '@/components/ui/elements/Heading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function UserSettings() {
	const t = useTranslations('dashboard.settings')
	return (
		<div className='lg:px-10'>
			<Heading
				title={t('header.heading')}
				description={t('header.description')}
				size='lg'
			/>
			<Tabs defaultValue='profile' className='mt-3 w-full'>
				<TabsList className='grid max-w-2xl grid-cols-5'>
					<TabsTrigger value='profile'>
						{t('header.profile')}
					</TabsTrigger>
					<TabsTrigger value='account'>
						{t('header.account')}
					</TabsTrigger>
					<TabsTrigger value='appearance'>
						{t('header.appearance')}
					</TabsTrigger>
					<TabsTrigger value='notifications'>
						{t('header.notifications')}
					</TabsTrigger>
					<TabsTrigger value='sessions'>
						{t('header.sessions')}
					</TabsTrigger>
				</TabsList>
				<TabsContent value='profile'>
					<div className='mb-4 mt-5 space-y-6'>
						<Heading
							title={t('profile.header.heading')}
							description={t('profile.header.description')}
						/>
					</div>
					<div className='space-y-6'>
						<ChangeAvatarForm />
						<ChangeInfoForm />
					</div>
				</TabsContent>
				<TabsContent value='account'>
					<div className='mt-5 space-y-6'>
						<Heading
							title={t('account.header.heading')}
							description={t('account.header.description')}
						/>
						<ChangeEmailForm />
						<ChangePasswordForm />
					</div>
				</TabsContent>
				<TabsContent value='appearance'>
					<div className='mt-5 space-y-6'>
						<Heading
							title={t('appearance.header.heading')}
							description={t('appearance.header.description')}
						/>
						<ChangeThemeForm />
						<ChangeLanguageForm />
						<ChangeColorForm />
					</div>
				</TabsContent>
				<TabsContent value='notifications'>
					<div className='mt-5 space-y-6'>
						<Heading
							title={t('notifications.header.heading')}
							description={t('notifications.header.description')}
						/>
						<ChangeNotificationsForm />
					</div>

					<div className='mt-5 space-y-6'>
						{/* <Heading
                            title={t('smtpSettings.header.heading')}
                            description={t('smtpSettings.header.description')}
                        /> */}
						<ChangeSmtpSettingsForm />
					</div>

					<div className='mt-5 space-y-6'>
						<ChangeTelegramSettingsForm />
					</div>
				</TabsContent>
				<TabsContent value='sessions'>
					<div className='mt-5 space-y-6'>
						<Heading
							title={t('sessions.header.heading')}
							description={t('sessions.header.description')}
						/>
						<SessionsList />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
