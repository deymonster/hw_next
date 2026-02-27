import path from 'path'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Toc } from './toc'

import fs from 'fs/promises'

import { getCurrentLanguage } from '@/libs/i18n/languages'

// Helper to generate IDs for headers
const generateId = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^\w\s-а-яА-ЯёЁ]/g, '')
		.replace(/\s+/g, '-')

// Helper to extract TOC
const extractToc = (markdown: string) => {
	const lines = markdown.split('\n')
	const items = []
	let inCodeBlock = false

	for (const line of lines) {
		if (line.startsWith('```')) {
			inCodeBlock = !inCodeBlock
			continue
		}
		if (inCodeBlock) {
			continue
		}

		// Match # Title or ## Title
		const match = line.match(/^(#{1,2})\s+(.+)$/)
		if (match) {
			const level = match[1].length
			const text = match[2].trim()
			const id = generateId(text)
			items.push({ id, text, level })
		}
	}
	return items
}

export default async function GuidePage() {
	const language = await getCurrentLanguage()

	// Determine file path with fallback
	const docsDir = path.join(process.cwd(), 'docs')
	let filename = `guide.${language}.md`
	let filePath = path.join(docsDir, filename)

	// Check if file exists, fallback to functional_description for RU if missing
	try {
		await fs.access(filePath)
	} catch {
		if (language === 'ru') {
			const fallbackPath = path.join(
				docsDir,
				'functional_description.ru.md'
			)
			try {
				await fs.access(fallbackPath)
				filePath = fallbackPath
				filename = 'functional_description.ru.md'
			} catch {
				// Keep original to show error
			}
		}
	}

	let content = ''
	try {
		content = await fs.readFile(filePath, 'utf-8')
	} catch (error) {
		content = `# Guide Not Found\n\nPlease create \`docs/${filename}\` or rename your existing documentation file.`
	}

	const tocItems = extractToc(content)

	return (
		<div className='container relative flex gap-10 py-6'>
			<main className='min-w-0 flex-1 space-y-8'>
				<div className='prose prose-stone dark:prose-invert max-w-none'>
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							h1: ({ children, ...props }) => {
								const text = String(children)
								const id = generateId(text)
								return (
									<h1
										id={id}
										className='mb-8 mt-2 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl'
										{...props}
									>
										{children}
									</h1>
								)
							},
							h2: ({ children, ...props }) => {
								const text = String(children)
								const id = generateId(text)
								return (
									<h2
										id={id}
										className='mb-4 mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0'
										{...props}
									>
										{children}
									</h2>
								)
							},
							h3: ({ children, ...props }) => (
								<h3
									className='mb-4 mt-8 scroll-m-20 text-2xl font-semibold tracking-tight'
									{...props}
								>
									{children}
								</h3>
							),
							p: ({ children, ...props }) => (
								<p
									className='leading-7 [&:not(:first-child)]:mt-6'
									{...props}
								>
									{children}
								</p>
							),
							ul: ({ children, ...props }) => (
								<ul
									className='my-6 ml-6 list-disc [&>li]:mt-2'
									{...props}
								>
									{children}
								</ul>
							),
							ol: ({ children, ...props }) => (
								<ol
									className='my-6 ml-6 list-decimal [&>li]:mt-2'
									{...props}
								>
									{children}
								</ol>
							),
							code: ({ children, ...props }) => (
								<code
									className='relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
									{...props}
								>
									{children}
								</code>
							),
							img: ({ src, alt, ...props }) => (
								<img
									src={src}
									alt={alt}
									className='my-4 rounded-md border bg-muted'
									{...props}
								/>
							),
							table: ({ children, ...props }) => (
								<div className='my-6 w-full overflow-y-auto'>
									<table
										className='w-full caption-bottom text-sm'
										{...props}
									>
										{children}
									</table>
								</div>
							),
							thead: ({ children, ...props }) => (
								<thead className='[&_tr]:border-b' {...props}>
									{children}
								</thead>
							),
							tr: ({ children, ...props }) => (
								<tr
									className='m-0 border-t p-0 transition-colors even:bg-muted/50 hover:bg-muted/50 data-[state=selected]:bg-muted'
									{...props}
								>
									{children}
								</tr>
							),
							th: ({ children, ...props }) => (
								<th
									className='h-12 border px-4 py-2 text-left align-middle font-medium text-muted-foreground [&[align=center]]:text-center [&[align=right]]:text-right'
									{...props}
								>
									{children}
								</th>
							),
							td: ({ children, ...props }) => (
								<td
									className='border p-4 align-middle [&:has([role=checkbox])]:pr-0 [&[align=center]]:text-center [&[align=right]]:text-right'
									{...props}
								>
									{children}
								</td>
							)
						}}
					>
						{content}
					</ReactMarkdown>
				</div>
			</main>
			<Toc items={tocItems} />
		</div>
	)
}
