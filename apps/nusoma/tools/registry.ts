import {
  airtableCreateRecordsTool,
  airtableGetRecordTool,
  airtableListRecordsTool,
  airtableUpdateRecordTool,
} from './airtable/index'
import { autoblocksPromptManagerTool } from './autoblocks/index'
import { browserUseRunTaskTool } from './browser_use/index'
import { clayPopulateTool } from './clay/index'
import { confluenceRetrieveTool, confluenceUpdateTool } from './confluence/index'
import {
  discordGetMessagesTool,
  discordGetServerTool,
  discordGetUserTool,
  discordSendMessageTool,
} from './discord/index'
import { elevenLabsTtsTool } from './elevenlabs/index'
import {
  exaAnswerTool,
  exaFindSimilarLinksTool,
  exaGetContentsTool,
  exaSearchTool,
} from './exa/index'
import { fileParseTool } from './file/index'
import { scrapeTool, searchTool } from './firecrawl/index'
import { functionExecuteTool } from './function/index'
import {
  githubCommentTool,
  githubLatestCommitTool,
  githubPrTool,
  githubRepoInfoTool,
} from './github/index'
import { gmailReadTool, gmailSearchTool, gmailSendTool } from './gmail/index'
import { searchTool as googleSearchTool } from './google/index'
import {
  googleCalendarCreateTool,
  googleCalendarGetTool,
  googleCalendarInviteTool,
  googleCalendarListTool,
  googleCalendarQuickAddTool,
} from './google_calendar/index'
import { googleDocsCreateTool, googleDocsReadTool, googleDocsWriteTool } from './google_docs/index'
import {
  googleDriveCreateFolderTool,
  googleDriveGetContentTool,
  googleDriveListTool,
  googleDriveUploadTool,
} from './google_drive/index'
import {
  googleSheetsAppendTool,
  googleSheetsReadTool,
  googleSheetsUpdateTool,
  googleSheetsWriteTool,
} from './google_sheets/index'
import { guestyGuestTool, guestyReservationTool } from './guesty/index'
import { requestTool as httpRequest } from './http/index'
import { contactsTool as hubspotContacts } from './hubspot/contacts'
import { huggingfaceChatTool } from './huggingface'
import { readUrlTool } from './jina/index'
import { jiraBulkRetrieveTool, jiraRetrieveTool, jiraUpdateTool, jiraWriteTool } from './jira/index'
import {
  knowledgeCreateDocumentTool,
  knowledgeSearchTool,
  knowledgeUploadChunkTool,
} from './knowledge'
import { linearCreateIssueTool, linearReadIssuesTool } from './linear/index'
import { linkupSearchTool } from './linkup/index'
import { mem0AddMemoriesTool, mem0GetMemoriesTool, mem0SearchMemoriesTool } from './mem0/index'
import { memoryAddTool, memoryDeleteTool, memoryGetAllTool, memoryGetTool } from './memory/index'
import {
  microsoftExcelReadTool,
  microsoftExcelTableAddTool,
  microsoftExcelWriteTool,
} from './microsoft_excel/index'
import {
  microsoftTeamsReadChannelTool,
  microsoftTeamsReadChatTool,
  microsoftTeamsWriteChannelTool,
  microsoftTeamsWriteChatTool,
} from './microsoft_teams/index'
import { mistralParserTool } from './mistral/index'
import { notionReadTool, notionWriteTool } from './notion/index'
import { imageTool, embeddingsTool as openAIEmbeddings } from './openai/index'
import { outlookDraftTool, outlookReadTool, outlookSendTool } from './outlook/index'
import { perplexityChatTool } from './perplexity/index'
import {
  pineconeFetchTool,
  pineconeGenerateEmbeddingsTool,
  pineconeSearchTextTool,
  pineconeSearchVectorTool,
  pineconeUpsertTextTool,
} from './pinecone/index'
import { redditGetCommentsTool, redditGetPostsTool, redditHotPostsTool } from './reddit/index'
import { s3GetObjectTool } from './s3/index'
import { opportunitiesTool as salesforceOpportunities } from './salesforce/opportunities'
import { searchTool as serperSearch } from './serper/index'
import { slackMessageTool } from './slack/index'
import { stagehandAgentTool, stagehandExtractTool } from './stagehand/index'
import { supabaseInsertTool, supabaseQueryTool } from './supabase/index'
import { tavilyExtractTool, tavilySearchTool } from './tavily/index'
import { telegramMessageTool } from './telegram/index'
import { thinkingTool } from './thinking/index'
import { sendSMSTool } from './twilio/index'
import { typeformFilesTool, typeformInsightsTool, typeformResponsesTool } from './typeform/index'
import type { ToolConfig } from './types'
import { visionTool } from './vision/index'
import { whatsappSendMessageTool } from './whatsapp/index'
import { workerExecutorTool } from './worker'
import { xReadTool, xSearchTool, xUserTool, xWriteTool } from './x/index'
import { youtubeSearchTool } from './youtube/index'

// Registry of all available tools
export const tools: Record<string, ToolConfig> = {
  huggingface_chat: huggingfaceChatTool,
  browser_use_run_task: browserUseRunTaskTool,
  autoblocks_prompt_manager: autoblocksPromptManagerTool,
  openai_embeddings: openAIEmbeddings,
  http_request: httpRequest,
  hubspot_contacts: hubspotContacts,
  salesforce_opportunities: salesforceOpportunities,
  function_execute: functionExecuteTool,
  vision_tool: visionTool,
  file_parser: fileParseTool,
  firecrawl_scrape: scrapeTool,
  firecrawl_search: searchTool,
  google_search: googleSearchTool,
  jina_read_url: readUrlTool,
  linkup_search: linkupSearchTool,
  jira_retrieve: jiraRetrieveTool,
  jira_update: jiraUpdateTool,
  jira_write: jiraWriteTool,
  jira_bulk_read: jiraBulkRetrieveTool,
  slack_message: slackMessageTool,
  github_repo_info: githubRepoInfoTool,
  github_latest_commit: githubLatestCommitTool,
  serper_search: serperSearch,
  tavily_search: tavilySearchTool,
  tavily_extract: tavilyExtractTool,
  supabase_query: supabaseQueryTool,
  supabase_insert: supabaseInsertTool,
  typeform_responses: typeformResponsesTool,
  typeform_files: typeformFilesTool,
  typeform_insights: typeformInsightsTool,
  youtube_search: youtubeSearchTool,
  notion_read: notionReadTool,
  notion_write: notionWriteTool,
  gmail_send: gmailSendTool,
  gmail_read: gmailReadTool,
  gmail_search: gmailSearchTool,
  whatsapp_send_message: whatsappSendMessageTool,
  x_write: xWriteTool,
  x_read: xReadTool,
  x_search: xSearchTool,
  x_user: xUserTool,
  pinecone_fetch: pineconeFetchTool,
  pinecone_generate_embeddings: pineconeGenerateEmbeddingsTool,
  pinecone_search_text: pineconeSearchTextTool,
  pinecone_search_vector: pineconeSearchVectorTool,
  pinecone_upsert_text: pineconeUpsertTextTool,
  github_pr: githubPrTool,
  github_comment: githubCommentTool,
  exa_search: exaSearchTool,
  exa_get_contents: exaGetContentsTool,
  exa_find_similar_links: exaFindSimilarLinksTool,
  exa_answer: exaAnswerTool,
  reddit_hot_posts: redditHotPostsTool,
  reddit_get_posts: redditGetPostsTool,
  reddit_get_comments: redditGetCommentsTool,
  google_drive_get_content: googleDriveGetContentTool,
  google_drive_list: googleDriveListTool,
  google_drive_upload: googleDriveUploadTool,
  google_drive_create_folder: googleDriveCreateFolderTool,
  google_docs_read: googleDocsReadTool,
  google_docs_write: googleDocsWriteTool,
  google_docs_create: googleDocsCreateTool,
  google_sheets_read: googleSheetsReadTool,
  google_sheets_write: googleSheetsWriteTool,
  google_sheets_update: googleSheetsUpdateTool,
  google_sheets_append: googleSheetsAppendTool,
  guesty_reservation: guestyReservationTool,
  guesty_guest: guestyGuestTool,
  perplexity_chat: perplexityChatTool,
  confluence_retrieve: confluenceRetrieveTool,
  confluence_update: confluenceUpdateTool,
  twilio_send_sms: sendSMSTool,
  airtable_create_records: airtableCreateRecordsTool,
  airtable_get_record: airtableGetRecordTool,
  airtable_list_records: airtableListRecordsTool,
  airtable_update_record: airtableUpdateRecordTool,
  mistral_parser: mistralParserTool,
  thinking_tool: thinkingTool,
  stagehand_extract: stagehandExtractTool,
  stagehand_agent: stagehandAgentTool,
  mem0_add_memories: mem0AddMemoriesTool,
  mem0_search_memories: mem0SearchMemoriesTool,
  mem0_get_memories: mem0GetMemoriesTool,
  memory_add: memoryAddTool,
  memory_get: memoryGetTool,
  memory_get_all: memoryGetAllTool,
  memory_delete: memoryDeleteTool,
  knowledge_search: knowledgeSearchTool,
  knowledge_upload_chunk: knowledgeUploadChunkTool,
  knowledge_create_document: knowledgeCreateDocumentTool,
  elevenlabs_tts: elevenLabsTtsTool,
  s3_get_object: s3GetObjectTool,
  telegram_message: telegramMessageTool,
  clay_populate: clayPopulateTool,
  discord_send_message: discordSendMessageTool,
  discord_get_messages: discordGetMessagesTool,
  discord_get_server: discordGetServerTool,
  discord_get_user: discordGetUserTool,
  openai_image: imageTool,
  microsoft_teams_read_chat: microsoftTeamsReadChatTool,
  microsoft_teams_write_chat: microsoftTeamsWriteChatTool,
  microsoft_teams_read_channel: microsoftTeamsReadChannelTool,
  microsoft_teams_write_channel: microsoftTeamsWriteChannelTool,
  outlook_read: outlookReadTool,
  outlook_send: outlookSendTool,
  outlook_draft: outlookDraftTool,
  linear_read_issues: linearReadIssuesTool,
  linear_create_issue: linearCreateIssueTool,
  microsoft_excel_read: microsoftExcelReadTool,
  microsoft_excel_write: microsoftExcelWriteTool,
  microsoft_excel_table_add: microsoftExcelTableAddTool,
  google_calendar_create: googleCalendarCreateTool,
  google_calendar_get: googleCalendarGetTool,
  google_calendar_list: googleCalendarListTool,
  google_calendar_quick_add: googleCalendarQuickAddTool,
  google_calendar_invite: googleCalendarInviteTool,
  worker_executor: workerExecutorTool,
}
