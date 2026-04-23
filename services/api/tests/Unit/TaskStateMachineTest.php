<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Tasks\Domain\Enums\TaskState;
use PHPUnit\Framework\TestCase;

class TaskStateMachineTest extends TestCase
{
    public function test_transiciones_validas_declaradas_en_enum(): void
    {
        $this->assertTrue(TaskState::Backlog->canTransitionTo(TaskState::ToDo));
        $this->assertTrue(TaskState::ToDo->canTransitionTo(TaskState::InProgress));
        $this->assertTrue(TaskState::InProgress->canTransitionTo(TaskState::InReview));
        $this->assertTrue(TaskState::InReview->canTransitionTo(TaskState::Done));

        // Cualquier estado activo puede ir a BLOCKED o CANCELLED
        $this->assertTrue(TaskState::ToDo->canTransitionTo(TaskState::Blocked));
        $this->assertTrue(TaskState::InProgress->canTransitionTo(TaskState::Cancelled));

        // BLOCKED sale a prácticamente cualquier estado activo
        $this->assertTrue(TaskState::Blocked->canTransitionTo(TaskState::InProgress));
        $this->assertTrue(TaskState::Blocked->canTransitionTo(TaskState::ToDo));
    }

    public function test_transiciones_invalidas_rechazadas(): void
    {
        // No hay atajo de Backlog a InProgress
        $this->assertFalse(TaskState::Backlog->canTransitionTo(TaskState::InProgress));
        // No hay ToDo → Done directo
        $this->assertFalse(TaskState::ToDo->canTransitionTo(TaskState::Done));
        // No self-transition
        $this->assertFalse(TaskState::InProgress->canTransitionTo(TaskState::InProgress));
        // Cancelled solo vuelve a Backlog
        $this->assertFalse(TaskState::Cancelled->canTransitionTo(TaskState::Done));
        $this->assertFalse(TaskState::Cancelled->canTransitionTo(TaskState::InProgress));
    }

    public function test_done_puede_reabrirse_a_in_progress(): void
    {
        $this->assertTrue(TaskState::Done->canTransitionTo(TaskState::InProgress));
    }

    public function test_category_mapping(): void
    {
        $this->assertSame('todo', TaskState::Backlog->category());
        $this->assertSame('todo', TaskState::ToDo->category());
        $this->assertSame('in_progress', TaskState::InProgress->category());
        $this->assertSame('in_progress', TaskState::InReview->category());
        $this->assertSame('in_progress', TaskState::Blocked->category());
        $this->assertSame('done', TaskState::Done->category());
        $this->assertSame('cancelled', TaskState::Cancelled->category());
    }

    public function test_terminal_flags(): void
    {
        $this->assertTrue(TaskState::Done->isTerminal());
        $this->assertTrue(TaskState::Cancelled->isTerminal());
        $this->assertFalse(TaskState::InProgress->isTerminal());
        $this->assertFalse(TaskState::Blocked->isTerminal());
    }
}
