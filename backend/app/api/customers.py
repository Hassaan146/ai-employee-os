import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse

router = APIRouter(prefix="/api/v1/crm/customers", tags=["Customers"])


@router.post("/", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = customer.model_dump()
    data["company_id"] = current_user.company_id
    new_customer = Customer(**data)
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer


@router.get("/", response_model=list[CustomerResponse])
def get_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get customers with pagination, filtering, and search."""
    query = db.query(Customer).filter(Customer.company_id == current_user.company_id)
    
    # Filter by status
    if status:
        query = query.filter(Customer.status == status)
    
    # Full-text search
    if search:
        query = query.filter(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%")) |
            (Customer.company_name.ilike(f"%{search}%"))
        )
    
    return query.offset(skip).limit(limit).all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_cust_id = uuid.UUID(str(customer_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = (
        db.query(Customer)
        .filter(Customer.id == valid_cust_id, Customer.company_id == current_user.company_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    updates: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_cust_id = uuid.UUID(str(customer_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = (
        db.query(Customer)
        .filter(Customer.id == valid_cust_id, Customer.company_id == current_user.company_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        valid_cust_id = uuid.UUID(str(customer_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = (
        db.query(Customer)
        .filter(Customer.id == valid_cust_id, Customer.company_id == current_user.company_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"}