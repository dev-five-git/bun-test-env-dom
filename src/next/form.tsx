import { type FormEvent, type FormHTMLAttributes, forwardRef } from 'react'

import { appRouter, state } from './state.ts'

type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, 'action'> & {
  action: string | ((formData: FormData) => void | Promise<void>)
  replace?: boolean
  scroll?: boolean
  prefetch?: false | null
}

// A submit button can override how its form submits; Next.js leaves anything
// but a same-window GET of url-encoded fields to the browser.
function isUnsupportedSubmitter(submitter: HTMLElement) {
  const encType = submitter.getAttribute('formEncType')
  const method = submitter.getAttribute('formMethod')
  const target = submitter.getAttribute('formTarget')
  return (
    (encType !== null && encType !== 'application/x-www-form-urlencoded') ||
    (method !== null && method !== 'get') ||
    (target !== null && target !== '_self') ||
    /\s*javascript:/i.test(submitter.getAttribute('formAction') ?? '')
  )
}

/**
 * `next/form`. With a string `action`, submitting navigates client-side: it
 * calls `router.push` (or `replace`) with the action and the fields as its
 * query, like a GET form. A function `action` is left to React. `method`,
 * `encType` and `target` are dropped, as Next.js drops them.
 */
const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  {
    replace,
    scroll,
    prefetch: _prefetch,
    method: _method,
    encType: _encType,
    target: _target,
    ...props
  },
  ref,
) {
  const { action, onSubmit } = props
  if (typeof action !== 'string') return <form {...props} ref={ref} />

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    onSubmit?.(event)
    if (event.defaultPrevented) return
    const { submitter } = event.nativeEvent as SubmitEvent
    if (submitter && isUnsupportedSubmitter(submitter)) return
    const url = new URL(
      submitter?.getAttribute('formAction') ?? action,
      state.url,
    )
    // Like a browser, the fields replace any query the action has.
    url.search = ''
    for (const [name, value] of new FormData(event.currentTarget)) {
      url.searchParams.append(
        name,
        typeof value === 'string' ? value : value.name,
      )
    }
    event.preventDefault()
    const navigate = replace ? appRouter.replace : appRouter.push
    navigate(
      url.origin === state.url.origin
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href,
      { scroll: scroll ?? true },
    )
  }

  return <form {...props} ref={ref} action={action} onSubmit={handleSubmit} />
})

export default Form
