using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskManagement.Domain.Entities;

namespace TaskManagement.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.HasKey(u => u.Id);
        b.Property(u => u.Id).ValueGeneratedNever();
        b.Property(u => u.Name).HasMaxLength(100).IsRequired();
        b.Property(u => u.Email).HasMaxLength(256).IsRequired();
        b.Property(u => u.PasswordHash).HasMaxLength(200).IsRequired();

        // Unique among active users only, so an email can be re-used after a soft delete.
        b.HasIndex(u => u.Email).IsUnique().HasFilter("[IsDeleted] = 0");

        // Soft-deleted users are invisible to every query by default.
        b.HasQueryFilter(u => !u.IsDeleted);
    }
}
