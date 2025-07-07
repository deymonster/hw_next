'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormField, FormItem } from '@/components/ui/form'
import { ScrollArea } from '@/components/ui/scrollarea'
import { useInventoryContext } from '@/contexts/InventoryContext'
import { useDepartment } from '@/hooks/useDepartment'

const departmentSelectionSchema = z.object({
	departments: z.array(z.string()).min(1, 'Выберите хотя бы один отдел')
})

type DepartmentSelectionForm = z.infer<typeof departmentSelectionSchema>

interface DepartmentSelectionStepProps {
	onNext: (departments: string[]) => void
}

export function DepartmentSelectionStep({
	onNext
}: DepartmentSelectionStepProps) {
	const t = useTranslations(
		'dashboard.inventory.modal.create.steps.department'
	)
	const { departments, isLoading } = useDepartment()
	const { state, setSelectedDepartments } = useInventoryContext()
	const [selectedDepts, setSelectedDepts] = useState<Set<string>>(
		new Set(state.selectedDepartments)
	)

	const form = useForm<DepartmentSelectionForm>({
		resolver: zodResolver(departmentSelectionSchema),
		defaultValues: {
			departments: state.selectedDepartments
		}
	})

	const toggleDepartment = (deptId: string) => {
		const newSelectedDepts = new Set(selectedDepts)
		if (newSelectedDepts.has(deptId)) {
			newSelectedDepts.delete(deptId)
		} else {
			newSelectedDepts.add(deptId)
		}
		setSelectedDepts(newSelectedDepts)
		form.setValue('departments', Array.from(newSelectedDepts), {
			shouldValidate: true
		})
	}

	const toggleAllDepartments = (checked: boolean) => {
		if (checked) {
			const allDeptIds = new Set(departments?.map(dept => dept.id) || [])
			setSelectedDepts(allDeptIds)
			form.setValue('departments', Array.from(allDeptIds), {
				shouldValidate: true
			})
		} else {
			setSelectedDepts(new Set())
			form.setValue('departments', [], { shouldValidate: true })
		}
	}

	const onSubmit = (data: DepartmentSelectionForm) => {
		setSelectedDepartments(data.departments)
		onNext(data.departments)
	}

	return (
		<div className='space-y-8'>
			<div>
				<p className='text-sm text-muted-foreground'>
					{t('description')}
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='space-y-6'
				>
					<div className='space-y-4'>
						<FormField
							control={form.control}
							name='departments'
							render={() => (
								<FormItem>
									<ScrollArea className='h-[300px] pr-4'>
										<div className='space-y-4'>
											{isLoading ? (
												<div className='flex items-center justify-center p-4'>
													<Loader2 className='h-6 w-6 animate-spin' />
													<span className='ml-2'>
														{t('loading')}
													</span>
												</div>
											) : (
												<>
													<div className='flex items-start space-x-3 border-b pb-4'>
														<Checkbox
															id='select-all'
															checked={
																departments?.length >
																	0 &&
																selectedDepts.size ===
																	departments?.length
															}
															onCheckedChange={
																toggleAllDepartments
															}
														/>
														<label
															htmlFor='select-all'
															className='cursor-pointer text-sm font-medium leading-none'
														>
															{selectedDepts.size >
															0
																? t(
																		'unselectAll'
																	)
																: t(
																		'selectAll'
																	)}
														</label>
													</div>

													{departments?.map(dept => (
														<div
															key={dept.id}
															className='flex items-start space-x-3'
														>
															<Checkbox
																id={dept.id}
																checked={selectedDepts.has(
																	dept.id
																)}
																onCheckedChange={() =>
																	toggleDepartment(
																		dept.id
																	)
																}
															/>
															<label
																htmlFor={
																	dept.id
																}
																className='cursor-pointer text-sm font-medium leading-none'
															>
																{dept.name}
															</label>
														</div>
													))}
												</>
											)}
										</div>
									</ScrollArea>
									<div className='mt-2 text-sm font-medium text-destructive'>
										{form.formState.errors.departments &&
											t('errors.required')}
									</div>
								</FormItem>
							)}
						/>
					</div>

					<div className='flex justify-end'>
						<Button type='submit'>{t('nextButton')}</Button>
					</div>
				</form>
			</Form>
		</div>
	)
}
