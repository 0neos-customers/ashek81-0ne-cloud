/**
 * POST /api/skool/oneoff-posts/post-now
 *
 * Immediately posts a one-off post to Skool, bypassing the scheduled time.
 * Updates the post status to 'published' on success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import { uploadFileFromUrl, createPost } from '@/features/skool/lib/post-client'
import type { SkoolOneOffPost } from '@0ne/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute max

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing post id' }, { status: 400 })
    }

    // Get the post
    const { data: post, error: fetchError } = await supabase
      .from('skool_oneoff_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const oneOff = post as SkoolOneOffPost

    // Check if post is in an editable status
    const editableStatuses = ['draft', 'approved', 'pending']
    if (!editableStatuses.includes(oneOff.status)) {
      return NextResponse.json(
        { error: `Cannot post: status is "${oneOff.status}". Only draft, approved, or scheduled posts can be posted.` },
        { status: 400 }
      )
    }

    console.log(`[Post Now] Posting "${oneOff.title}" to ${oneOff.group_slug}`)

    // Upload image if present
    let attachmentIds: string[] = []
    if (oneOff.image_url) {
      console.log(`[Post Now] Uploading image: ${oneOff.image_url}`)
      const upload = await uploadFileFromUrl(oneOff.image_url, oneOff.group_slug)
      if ('fileId' in upload && upload.fileId) {
        attachmentIds = [upload.fileId]
        console.log(`[Post Now] Image uploaded: ${upload.fileId}`)
      } else {
        console.log(`[Post Now] Image upload failed, continuing without image`)
      }
    }

    // Create the post on Skool
    const postResult = await createPost({
      groupSlug: oneOff.group_slug,
      title: oneOff.title,
      body: oneOff.body,
      categoryId: oneOff.category_id || undefined,
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      videoLinks: oneOff.video_url ? [oneOff.video_url] : undefined,
    })

    if (!postResult.success) {
      console.error(`[Post Now] Failed to post:`, postResult.error)

      // Update post with error
      await supabase
        .from('skool_oneoff_posts')
        .update({
          status: 'failed',
          error_message: postResult.error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return NextResponse.json(
        { error: postResult.error || 'Failed to post to Skool' },
        { status: 500 }
      )
    }

    console.log(`[Post Now] Post created successfully: ${postResult.postId}`)

    // Update post status to published
    const { error: updateError } = await supabase
      .from('skool_oneoff_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        skool_post_id: postResult.postId,
        skool_post_url: postResult.postUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error(`[Post Now] Failed to update post status:`, updateError)
    }

    // Log the execution
    await supabase.from('skool_post_execution_log').insert({
      oneoff_post_id: id,
      status: 'success',
      skool_post_id: postResult.postId,
      skool_post_url: postResult.postUrl,
      executed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      postId: postResult.postId,
      postUrl: postResult.postUrl,
    })
  } catch (error) {
    console.error('[Post Now] Exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
