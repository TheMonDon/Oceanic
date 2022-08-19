import BaseRoute from "./BaseRoute";
import type {
	CreateEmojiOptions,
	EditEmojiOptions,
	GuildEmoji,
	RawGuild,
	RawGuildEmoji
} from "../types/guilds";
import * as Routes from "../util/Routes";
import Guild from "../structures/Guild";
import type { AutoModerationRule, CreateAutoModerationRuleOptions, EditAutoModerationRuleOptions, RawAutoModerationRule } from "../types/auto-moderation";
import { AutoModerationActionTypes, AutoModerationEventTypes, AutoModerationKeywordPresetTypes, AutoModerationTriggerTypes } from "../Constants";

export default class Guilds extends BaseRoute {
	private _formatAutoModRule(data: RawAutoModerationRule) {
		return {
			actions: data.actions.map(a => ({
				metadata: {
					channelID:       a.metadata.channel_id,
					durationSeconds: a.metadata.duration_seconds
				},
				type: a.type
			})),
			creatorID:       data.creator_id,
			enabled:         data.enabled,
			eventType:       data.event_type,
			exemptChannels:  data.exempt_channels,
			exemptRoles:     data.exempt_roles,
			guildID:         data.guild_id,
			id:              data.id,
			name:            data.name,
			triggerMetadata: {
				allowList:         data.trigger_metadata.allow_list,
				keywordFilter:     data.trigger_metadata.keyword_filter,
				mentionTotalLimit: data.trigger_metadata.mention_total_limit,
				presets:           data.trigger_metadata.presets
			},
			triggerType: data.trigger_type
		} as AutoModerationRule;
	}

	/**
	 * Create an auto moderation rule for a guild.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {Object} options
	 * @param {Object[]} options.actions - The actions to take.
	 * @param {Object} options.actions[].metadata - The metadata for the action.
	 * @param {String} [options.actions[].metadata.channelID] - The ID of the channel to send the message to. (`SEND_ALERT_MESSAGE`)
	 * @param {Number} [options.actions[].metadata.durationSeconds] - The duration of the timeout in seconds. (`TIMEOUT`)
	 * @param {AutoModerationActionTypes} options.actions[].type - The type of action to take.
	 * @param {AutoModerationEventTypes} options.eventType - The event type to trigger on.
	 * @param {String[]} options.exemptChannels - The channels to exempt from the rule.
	 * @param {String[]} options.exemptRoles - The roles to exempt from the rule.
	 * @param {String} [options.reason] - The reason for creating the rule.
	 * @param {Object} [options.triggerMetadata] - The metadata to use for the trigger.
	 * @param {String} [options.triggerMetadata.allowList] - The keywords to allow. (`KEYWORD_PRESET`)
	 * @param {String[]} [options.triggerMetadata.keywordFilter] - The keywords to filter. (`KEYWORD`)
	 * @param {Number} [options.triggerMetadata.mentionTotalLimit] - The maximum number of mentions to allow. (`MENTION_SPAM`)
	 * @param {AutoModerationKeywordPresetTypes[]} [options.triggerMetadata.presets] - The presets to use. (`KEYWORD_PRESET`)
	 * @param {AutoModerationTriggerTypes} options.triggerType - The type of trigger to use.
	 * @returns {Promise<AutoModerationRule>}
	 */
	async createAutoModerationRule(id: string, options: CreateAutoModerationRuleOptions) {
		const reason = options.reason;
		if (options.reason) delete options.reason;
		return this._manager.authRequest<RawAutoModerationRule>({
			method: "POST",
			path:   Routes.GUILD_AUTOMOD_RULES(id),
			json:   {
				actions: options.actions.map(a => ({
					metadata: {
						channel_id:       a.metadata.channelID,
						duration_seconds: a.metadata.durationSeconds
					},
					type: a.type
				})),
				event_type:       options.eventType,
				exempt_channels:  options.exemptChannels,
				exempt_roles:     options.exemptRoles,
				name:             options.name,
				trigger_metadata: !options.triggerMetadata ? undefined : {
					allow_list:          options.triggerMetadata.allowList,
					keyword_filter:      options.triggerMetadata.keywordFilter,
					mention_total_limit: options.triggerMetadata.mentionTotalLimit,
					presets:             options.triggerMetadata.presets
				},
				trigger_type: options.triggerType
			},
			reason
		}).then(data => this._formatAutoModRule(data));
	}

	/**
	 * Create an emoji in a guild.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {Object} options
	 * @param {String} options.name - The name of the emoji.
	 * @param {(Buffer | String)} options.image - The image (buffer, or full data url).
	 * @param {String} [options.reason] - The reason for creating the emoji.
	 * @param {String[]} [options.roles] - The roles to restrict the emoji to.
	 * @returns {Promise<GuildEmoji>}
	 */
	async createEmoji(id: string, options: CreateEmojiOptions) {
		const reason = options.reason;
		if (options.reason) delete options.reason;
		if (options.image) {
			try {
				options.image = this._client._convertImage(options.image);
			} catch (err) {
				throw new Error("Invalid image provided. Ensure you are providing a valid, fully-qualified base64 url.", { cause: err as Error });
			}
		}
		return this._manager.authRequest<RawGuildEmoji>({
			method: "POST",
			path:   Routes.GUILD_EMOJIS(id),
			json:   {
				image: options.image,
				name:  options.name,
				roles: options.roles
			},
			reason
		}).then(data => ({
			...data,
			user: !data.user ? undefined : this._client.users.update(data.user)
		}));
	}

	/**
	 * Delete an auto moderation rule.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {String} ruleID - The ID of the rule to delete.
	 * @param {String} [reason] - The reason for deleting the rule.
	 * @returns {Promise<void>}
	 */
	async deleteAutoModerationRule(id: string, ruleID: string, reason?: string) {
		await this._manager.authRequest<null>({
			method: "DELETE",
			path:   Routes.GUILD_AUTOMOD_RULE(id, ruleID),
			reason
		});
	}

	/**
	 * Delete an emoji.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {String} emojiID - The ID of the emoji.
	 * @param {String} [reason] - The reason for deleting the emoji.
	 * @returns {Promise<void>}
	 */
	async deleteEmoji(id: string, emojiID: string, reason?: string) {
		await this._manager.authRequest<null>({
			method: "DELETE",
			path:   Routes.GUILD_EMOJI(id, emojiID),
			reason
		});
	}

	/**
	 * Edit an existing auto moderation rule.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {String} ruleID - The ID of the rule to edit.
	 * @param {Object} options
	 * @param {Object[]} [options.actions] - The actions to take.
	 * @param {Object} options.actions[].metadata - The metadata for the action.
	 * @param {String} [options.actions[].metadata.channelID] - The ID of the channel to send the message to. (`SEND_ALERT_MESSAGE`)
	 * @param {Number} [options.actions[].metadata.durationSeconds] - The duration of the timeout in seconds. (`TIMEOUT`)
	 * @param {AutoModerationActionTypes} options.actions[].type - The type of action to take.
	 * @param {AutoModerationEventTypes} options.eventType - The event type to trigger on.
	 * @param {String[]} [options.exemptChannels] - The channels to exempt from the rule.
	 * @param {String[]} [options.exemptRoles] - The roles to exempt from the rule.
	 * @param {String} [options.reason] - The reason for editing the rule.
	 * @param {Object} [options.triggerMetadata] - The metadata to use for the trigger.
	 * @param {String} [options.triggerMetadata.allowList] - The keywords to allow. (`KEYWORD_PRESET`)
	 * @param {String[]} [options.triggerMetadata.keywordFilter] - The keywords to filter. (`KEYWORD`)
	 * @param {Number} [options.triggerMetadata.mentionTotalLimit] - The maximum number of mentions to allow. (`MENTION_SPAM`)
	 * @param {AutoModerationKeywordPresetTypes[]} [options.triggerMetadata.presets] - The presets to use. (`KEYWORD_PRESET`)
	 * @returns {Promise<AutoModerationRule>}
	 */
	async editAutoModerationRule(id: string, ruleID: string, options: EditAutoModerationRuleOptions) {
		const reason = options.reason;
		if (options.reason) delete options.reason;
		return this._manager.authRequest<RawAutoModerationRule>({
			method: "PATCH",
			path:   Routes.GUILD_AUTOMOD_RULE(id, ruleID),
			json:   {
				actions: options.actions?.map(a => ({
					metadata: {
						channel_id:       a.metadata.channelID,
						duration_seconds: a.metadata.durationSeconds
					},
					type: a.type
				})),
				event_type:       options.eventType,
				exempt_channels:  options.exemptChannels,
				exempt_roles:     options.exemptRoles,
				name:             options.name,
				trigger_metadata: !options.triggerMetadata ? undefined : {
					allow_list:          options.triggerMetadata.allowList,
					keyword_filter:      options.triggerMetadata.keywordFilter,
					mention_total_limit: options.triggerMetadata.mentionTotalLimit,
					presets:             options.triggerMetadata.presets
				}
			},
			reason
		}).then(data => this._formatAutoModRule(data));
	}

	/**
	 * Edit an existing emoji.
	 *
	 * @param {String} id - The ID of the guild the emoji is in.
	 * @param {Object} options
	 * @param {String} [options.name] - The name of the emoji.
	 * @param {String} [options.reason] - The reason for creating the emoji.
	 * @param {String[]} [options.roles] - The roles to restrict the emoji to.
	 * @returns {Promise<GuildEmoji>}
	 */
	async editEmoji(id: string, emojiID: string, options: EditEmojiOptions) {
		const reason = options.reason;
		if (options.reason) delete options.reason;
		return this._manager.authRequest<RawGuildEmoji>({
			method: "POST",
			path:   Routes.GUILD_EMOJI(id, emojiID),
			json:   {
				name:  options.name,
				roles: options.roles
			},
			reason
		}).then(data => ({
			...data,
			user: !data.user ? undefined : this._client.users.update(data.user)
		}));
	}

	async get(id: string) {
		return this._manager.authRequest<RawGuild>({
			method: "GET",
			path:   Routes.GUILD(id)
		}).then(data => new Guild(data, this._client));
	}

	/**
	 * Get an auto moderation rule for a guild.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {String} ruleID - The ID of the rule to get.
	 * @returns {Promise<AutoModerationRule>}
	 */
	async getAutoModerationRule(id: string, ruleID: string) {
		return this._manager.authRequest<RawAutoModerationRule>({
			method: "GET",
			path:   Routes.GUILD_AUTOMOD_RULE(id, ruleID)
		}).then(data => this._formatAutoModRule(data));
	}

	/**
	 * Get the auto moderation rules for a guild.
	 *
	 * @param {String} id - The ID of the guild.
	 * @returns {Promise<AutoModerationRule[]>}
	 */
	async getAutoModerationRules(id: string) {
		return this._manager.authRequest<Array<RawAutoModerationRule>>({
			method: "GET",
			path:   Routes.GUILD_AUTOMOD_RULES(id)
		}).then(data => data.map(d => this._formatAutoModRule(d)));
	}

	/**
	 * Get an emoji in a guild.
	 *
	 * @param {String} id - The ID of the guild.
	 * @param {String} emojiID - The ID of the emoji to get.
	 * @returns {Promise<GuildEmoji>}
	 */
	async getEmoji(id: string, emojiID: string) {
		return this._manager.authRequest<RawGuildEmoji>({
			method: "GET",
			path:   Routes.GUILD_EMOJI(id, emojiID)
		}).then(data => ({
			...data,
			user: !data.user ? undefined : this._client.users.update(data.user)
		}) as GuildEmoji);
	}

	/**
	 * Get the emojis in a guild.
	 *
	 * @param {String} id - The ID of the guild.
	 * @returns {Promise<GuildEmoji[]>}
	 */
	async getEmojis(id: string) {
		return this._manager.authRequest<Array<RawGuildEmoji>>({
			method: "GET",
			path:   Routes.GUILD_EMOJIS(id)
		}).then(data => data.map(d => ({
			...d,
			user: !d.user ? undefined : this._client.users.update(d.user)
		}) as GuildEmoji));
	}
}
