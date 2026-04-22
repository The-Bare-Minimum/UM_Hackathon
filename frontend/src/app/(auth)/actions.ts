'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = formData.get('businessName') as string

  if (!email || !password || !businessName) {
    return { error: 'All fields are required' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Automatically insert a new row into the businesses table
    const { error: insertError } = await supabase.from('businesses').insert({
      id: data.user.id,
      name: businessName,
      industry: 'F&B',
    })

    if (insertError) {
      console.error('Error inserting business:', insertError)
      // Even if business insert fails, the user is created. We could handle this differently.
      return { error: 'User created but failed to initialize business profile.' }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to verify your account or login to continue.')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}
