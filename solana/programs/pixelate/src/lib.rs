use anchor_lang::prelude::*;

declare_id!("UCmh4ueqZ8HDQNdHQVLz6hjy5bjz7TmQzCZMLmLhes5");

#[program]
pub mod pixelate {
  use super::*;
  pub fn start_stuff_off(ctx: Context<StartStuffOff>) -> Result <()> {
      let base_account = &mut ctx.accounts.base_account;
      base_account.total_images = 0;
    Ok(())
  }

  pub fn add_image(ctx: Context<AddImage>, image_cid: String) -> Result < String > {
      let base_account = &mut ctx.accounts.base_account;
      let user = &mut ctx.accounts.user;

      let item = ItemStruct {
          item_number: base_account.total_images + 1,
          image_cid: image_cid.to_string(),
          user_address: *user.to_account_info().key,
      };

      base_account.image_list.push(item);
      base_account.total_images += 1;
      Ok(image_cid.to_string())
  }

  pub fn remove_image(ctx: Context<RemoveImage>, image_cid: String) -> Result < String > {
    let base_account = &mut ctx.accounts.base_account;
    let images = &mut base_account.image_list;

    let index = images.iter().position(| ItemStruct{item_number: _, image_cid, user_address: _} | image_cid == image_cid);
    match index {
        Some(i) => {
            images.remove(i);
            base_account.total_images -= 1;
        },
        None => {}
    }
    Ok(image_cid.to_string())
  }

  pub fn reset_images(ctx: Context<ResetImages>) -> Result < () > {
      let base_account = &mut ctx.accounts.base_account;

      base_account.image_list = vec![];
      base_account.total_images = 0;
      Ok(())
  }

}

#[derive(Accounts)]
pub struct StartStuffOff<'info> {
    #[account(init, payer = user, space = 9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}

#[derive(Accounts)]
pub struct AddImage<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveImage<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
}

#[derive(Accounts)]
pub struct ResetImages<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ItemStruct {
    pub item_number: u64,
    pub image_cid: String,
    pub user_address: Pubkey,
}

#[account]
pub struct BaseAccount {
    pub total_images: u64,
    pub image_list: Vec<ItemStruct>,
}
