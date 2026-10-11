import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AiService, ChatMessage, ChatResponse } from '../../core/services/ai.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-ai-chat',
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './ai-chat.component.html',
    styleUrl: './ai-chat.component.css'
})
export class AiChatComponent implements AfterViewChecked, OnInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private aiService = inject(AiService);
  private auth = inject(AuthService);

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  suggestions = signal<string[]>([]);
  inputMessage = '';
  private conversationId: string | undefined;

  quickPrompts = [
    'What can I book here?',
    'Any recliner seats available today?',
    'Recommend a seat class under ₹500',
    'How do I cancel a booking?'
  ];

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  sendMessage(): void {
    const text = this.inputMessage.trim();
    if (!text || this.loading()) return;

    this.inputMessage = '';
    this.addMessage('user', text);
    this.loading.set(true);
    this.suggestions.set([]);

    const userId = this.auth.currentUser()?.id;

    this.aiService.chat(text, this.conversationId, userId).subscribe({
      next: (res: ChatResponse) => {
        this.conversationId = res.conversationId;
        this.addMessage('assistant', res.response);
        this.suggestions.set(res.suggestedActions || []);
        this.loading.set(false);
      },
      error: () => {
        this.addMessage('assistant', 'Sorry, I ran into an issue. Please try again.');
        this.loading.set(false);
      }
    });
  }

  sendQuickPrompt(prompt: string): void {
    this.inputMessage = prompt;
    this.sendMessage();
  }

  onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearConversation(): void {
    this.messages.set([]);
    this.conversationId = undefined;
    this.suggestions.set([]);
  }

  formatMessage(content: string): string {
    // Convert markdown-like bold, bullets, and newlines to HTML
    return content
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.update(msgs => [...msgs, { role, content, timestamp: new Date() }]);
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
